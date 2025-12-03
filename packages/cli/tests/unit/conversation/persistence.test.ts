import {
    createSession,
    saveSession,
    loadSession,
    listSessions,
    deleteSession,
    findSessionByName,
    generateSessionId,
    getSessionPath,
} from '../../../src/conversation/persistence';
import { Message, ProviderType } from '../../../src/config/types';
import fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('os', () => ({
    homedir: () => '/mock/home',
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Session Persistence', () => {
    const mockMessages: Message[] = [
        {
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date('2024-01-01T00:00:01Z'),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSession', () => {
        it('should create session with messages', () => {
            const session = createSession(mockMessages, 'gemini');

            expect(session.messages).toEqual(mockMessages);
            expect(session.provider).toBe('gemini');
            expect(session.id).toBeDefined();
            expect(session.createdAt).toBeInstanceOf(Date);
            expect(session.updatedAt).toBeInstanceOf(Date);
        });

        it('should create session with name', () => {
            const session = createSession(mockMessages, 'gemini', 'Test Session');

            expect(session.name).toBe('Test Session');
        });

        it('should create session without name', () => {
            const session = createSession(mockMessages, 'llamacpp');

            expect(session.name).toBeUndefined();
            expect(session.provider).toBe('llamacpp');
        });

        it('should generate unique session IDs', () => {
            const session1 = createSession(mockMessages, 'gemini');
            const session2 = createSession(mockMessages, 'gemini');

            expect(session1.id).not.toBe(session2.id);
        });
    });

    describe('generateSessionId', () => {
        it('should generate ID with timestamp', () => {
            const id = generateSessionId();

            expect(id).toMatch(/^\d+-[a-z0-9]+$/);
        });

        it('should generate unique IDs', () => {
            const id1 = generateSessionId();
            const id2 = generateSessionId();

            expect(id1).not.toBe(id2);
        });
    });

    describe('saveSession', () => {
        it('should save session to file', async () => {
            const session = createSession(mockMessages, 'gemini', 'Test');
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            await saveSession(session);

            expect(mockFs.mkdir).toHaveBeenCalled();
            expect(mockFs.writeFile).toHaveBeenCalled();

            const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0];
            const savedContent = JSON.parse(writeCall[1]);

            expect(savedContent.messages).toHaveLength(2);
            expect(savedContent.provider).toBe('gemini');
            expect(savedContent.name).toBe('Test');
        });

        it('should create sessions directory if not exists', async () => {
            const session = createSession(mockMessages, 'gemini');
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            await saveSession(session);

            expect(mockFs.mkdir).toHaveBeenCalledWith(
                expect.stringContaining('sessions'),
                expect.objectContaining({ recursive: true })
            );
        });
    });

    describe('loadSession', () => {
        it('should load session from file', async () => {
            const mockSessionData = {
                id: 'test-123',
                name: 'Loaded Session',
                messages: mockMessages.map((m) => ({
                    ...m,
                    timestamp: m.timestamp!.toISOString(),
                })),
                provider: 'gemini' as ProviderType,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockSessionData));

            const session = await loadSession('test-123');

            expect(session).not.toBeNull();
            expect(session?.id).toBe('test-123');
            expect(session?.name).toBe('Loaded Session');
            expect(session?.messages).toHaveLength(2);
            expect(session?.messages[0].timestamp).toBeInstanceOf(Date);
        });

        it('should return null for non-existent session', async () => {
            mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

            const session = await loadSession('nonexistent');

            expect(session).toBeNull();
        });

        it('should handle corrupted session file', async () => {
            mockFs.readFile.mockResolvedValue('invalid json');

            const session = await loadSession('corrupted');

            expect(session).toBeNull();
        });
    });

    describe('listSessions', () => {
        it('should list all sessions', async () => {
            const mockFiles = ['session1.json', 'session2.json', 'notjson.txt'];
            mockFs.readdir.mockResolvedValue(mockFiles as any);

            const mockSession1 = {
                id: 'session1',
                messages: [],
                provider: 'gemini' as ProviderType,
                createdAt: new Date('2024-01-01').toISOString(),
                updatedAt: new Date('2024-01-02').toISOString(),
            };

            const mockSession2 = {
                id: 'session2',
                messages: [],
                provider: 'llamacpp' as ProviderType,
                createdAt: new Date('2024-01-03').toISOString(),
                updatedAt: new Date('2024-01-04').toISOString(),
            };

            mockFs.readFile.mockImplementation((filePath: any) => {
                if (filePath.includes('session1')) {
                    return Promise.resolve(JSON.stringify(mockSession1));
                } else if (filePath.includes('session2')) {
                    return Promise.resolve(JSON.stringify(mockSession2));
                }
                return Promise.reject(new Error('Not found'));
            });

            const sessions = await listSessions();

            expect(sessions).toHaveLength(2);
            expect(sessions[0].id).toBe('session2');
            expect(sessions[1].id).toBe('session1');
        });

        it('should handle empty sessions directory', async () => {
            mockFs.readdir.mockResolvedValue([] as any);

            const sessions = await listSessions();

            expect(sessions).toEqual([]);
        });

        it('should handle non-existent directory', async () => {
            mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

            const sessions = await listSessions();

            expect(sessions).toEqual([]);
        });
    });

    describe('deleteSession', () => {
        it('should delete session file', async () => {
            mockFs.unlink.mockResolvedValue(undefined);

            await deleteSession('test-session');

            expect(mockFs.unlink).toHaveBeenCalledWith(
                expect.stringContaining('test-session.json')
            );
        });

        it('should handle delete errors gracefully', async () => {
            mockFs.unlink.mockRejectedValue(new Error('ENOENT'));

            await expect(deleteSession('nonexistent')).resolves.not.toThrow();
        });
    });

    describe('findSessionByName', () => {
        it('should find session by exact name', async () => {
            const mockFiles = ['session1.json'];
            const mockSession = {
                id: 'session1',
                name: 'My Session',
                messages: [],
                provider: 'gemini' as ProviderType,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockFs.readdir.mockResolvedValue(mockFiles as any);
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockSession));

            const session = await findSessionByName('My Session');

            expect(session).not.toBeNull();
            expect(session?.name).toBe('My Session');
        });

        it('should return null if not found', async () => {
            mockFs.readdir.mockResolvedValue([] as any);

            const session = await findSessionByName('Nonexistent');

            expect(session).toBeNull();
        });

        it('should handle case-insensitive search', async () => {
            const mockFiles = ['session1.json'];
            const mockSession = {
                id: 'session1',
                name: 'TEST SESSION',
                messages: [],
                provider: 'gemini' as ProviderType,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockFs.readdir.mockResolvedValue(mockFiles as any);
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockSession));

            const session = await findSessionByName('test session');

            expect(session).not.toBeNull();
        });
    });

    describe('getSessionPath', () => {
        it('should return correct session path', () => {
            const sessionPath = getSessionPath('test-123');

            expect(sessionPath).toContain('sessions');
            expect(sessionPath).toContain('test-123.json');
        });
    });
});
