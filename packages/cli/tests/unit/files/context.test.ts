import { ContextManager } from '../../../src/files/context';
import { FileReadResult } from '../../../src/files/reader';

describe('Context Manager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
        contextManager = new ContextManager();
    });

    describe('File Management', () => {
        it('should add file to context', () => {
            const file: FileReadResult = {
                path: 'test.ts',
                content: 'console.log("test");',
                size: 20,
                exists: true,
            };

            contextManager.addFile(file);

            expect(contextManager.getFileCount()).toBe(1);
            expect(contextManager.getContextSize()).toBe(20);
        });

        it('should add multiple files', () => {
            const file1: FileReadResult = {
                path: 'file1.ts',
                content: 'test1',
                size: 5,
                exists: true,
            };

            const file2: FileReadResult = {
                path: 'file2.ts',
                content: 'test2',
                size: 5,
                exists: true,
            };

            contextManager.addFile(file1);
            contextManager.addFile(file2);

            expect(contextManager.getFileCount()).toBe(2);
            expect(contextManager.getContextSize()).toBe(10);
        });

        it('should get all files', () => {
            const file: FileReadResult = {
                path: 'test.ts',
                content: 'content',
                size: 7,
                exists: true,
            };

            contextManager.addFile(file);
            const files = contextManager.getFiles();

            expect(files).toHaveLength(1);
            expect(files[0].path).toBe('test.ts');
        });

        it('should clear all files', () => {
            const file: FileReadResult = {
                path: 'test.ts',
                content: 'content',
                size: 7,
                exists: true,
            };

            contextManager.addFile(file);
            contextManager.clearAll();

            expect(contextManager.getFileCount()).toBe(0);
            expect(contextManager.getContextSize()).toBe(0);
        });
    });

    describe('Context Text Generation', () => {
        it('should generate formatted context text', () => {
            const file: FileReadResult = {
                path: 'test.ts',
                content: 'const x = 1;',
                size: 12,
                exists: true,
            };

            contextManager.addFile(file);
            const contextText = contextManager.getContextText();

            expect(contextText).toContain('test.ts');
            expect(contextText).toContain('const x = 1;');
            expect(contextText).toContain('```');
        });

        it('should return empty string when no files', () => {
            const contextText = contextManager.getContextText();

            expect(contextText).toBe('');
        });

        it('should format multiple files correctly', () => {
            const file1: FileReadResult = {
                path: 'file1.ts',
                content: 'content1',
                size: 8,
                exists: true,
            };

            const file2: FileReadResult = {
                path: 'file2.ts',
                content: 'content2',
                size: 8,
                exists: true,
            };

            contextManager.addFile(file1);
            contextManager.addFile(file2);
            const contextText = contextManager.getContextText();

            expect(contextText).toContain('file1.ts');
            expect(contextText).toContain('file2.ts');
            expect(contextText).toContain('content1');
            expect(contextText).toContain('content2');
        });
    });

    describe('Size Limits', () => {
        it('should track total context size', () => {
            const file1: FileReadResult = {
                path: 'file1.ts',
                content: 'a'.repeat(1000),
                size: 1000,
                exists: true,
            };

            const file2: FileReadResult = {
                path: 'file2.ts',
                content: 'b'.repeat(500),
                size: 500,
                exists: true,
            };

            contextManager.addFile(file1);
            contextManager.addFile(file2);

            expect(contextManager.getContextSize()).toBe(1500);
        });

        it('should handle empty files', () => {
            const file: FileReadResult = {
                path: 'empty.ts',
                content: '',
                size: 0,
                exists: true,
            };

            contextManager.addFile(file);

            expect(contextManager.getFileCount()).toBe(1);
            expect(contextManager.getContextSize()).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle duplicate file paths', () => {
            const file1: FileReadResult = {
                path: 'test.ts',
                content: 'version1',
                size: 8,
                exists: true,
            };

            const file2: FileReadResult = {
                path: 'test.ts',
                content: 'version2',
                size: 8,
                exists: true,
            };

            contextManager.addFile(file1);
            contextManager.addFile(file2);

            expect(contextManager.getFileCount()).toBe(2);
        });

        it('should handle special characters in path', () => {
            const file: FileReadResult = {
                path: 'special/[file]-name.ts',
                content: 'content',
                size: 7,
                exists: true,
            };

            contextManager.addFile(file);
            const contextText = contextManager.getContextText();

            expect(contextText).toContain('special/[file]-name.ts');
        });
    });
});
