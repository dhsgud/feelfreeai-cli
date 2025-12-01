import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Session, Message, ProviderType } from '../config/types';

/**
 * 세션 디렉토리 경로
 */
export function getSessionsDir(): string {
    return path.join(os.homedir(), '.feelfreeai', 'sessions');
}

/**
 * 세션 디렉토리 생성
 */
export async function ensureSessionsDir(): Promise<void> {
    const sessionsDir = getSessionsDir();
    await fs.mkdir(sessionsDir, { recursive: true });
}

/**
 * 세션 파일 경로
 */
export function getSessionPath(sessionId: string): string {
    return path.join(getSessionsDir(), `${sessionId}.json`);
}

/**
 * 세션 저장
 */
export async function saveSession(session: Session): Promise<void> {
    await ensureSessionsDir();
    const sessionPath = getSessionPath(session.id);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

/**
 * 세션 불러오기
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
    try {
        const sessionPath = getSessionPath(sessionId);
        const data = await fs.readFile(sessionPath, 'utf-8');
        const session = JSON.parse(data) as Session;

        // Date 객체로 변환
        session.createdAt = new Date(session.createdAt);
        session.updatedAt = new Date(session.updatedAt);
        session.messages = session.messages.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
        }));

        return session;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * 세션 목록 가져오기
 */
export async function listSessions(): Promise<Session[]> {
    try {
        await ensureSessionsDir();
        const sessionsDir = getSessionsDir();
        const files = await fs.readdir(sessionsDir);

        const sessions: Session[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const sessionId = file.replace('.json', '');
                const session = await loadSession(sessionId);
                if (session) {
                    sessions.push(session);
                }
            }
        }

        // 최신순 정렬
        sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return sessions;
    } catch (error) {
        return [];
    }
}

/**
 * 세션 삭제
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
    try {
        const sessionPath = getSessionPath(sessionId);
        await fs.unlink(sessionPath);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

/**
 * 세션 ID 생성
 */
export function generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

/**
 * 세션 생성
 */
export function createSession(
    messages: Message[],
    provider: ProviderType,
    name?: string
): Session {
    const now = new Date();
    return {
        id: generateSessionId(),
        name,
        messages,
        createdAt: now,
        updatedAt: now,
        provider,
    };
}

/**
 * 최근 세션 가져오기
 */
export async function getRecentSession(): Promise<Session | null> {
    const sessions = await listSessions();
    return sessions.length > 0 ? sessions[0] : null;
}

/**
 * 세션 이름으로 찾기
 */
export async function findSessionByName(name: string): Promise<Session | null> {
    const sessions = await listSessions();
    return sessions.find((s) => s.name === name) ?? null;
}
