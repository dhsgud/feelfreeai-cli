import fs from 'fs/promises';
import path from 'path';
import { ko } from '../config/locales/ko';

/**
 * 파일 읽기 결과
 */
export interface FileReadResult {
    /** 파일 경로 */
    path: string;
    /** 파일 내용 */
    content: string;
    /** 파일 크기 (바이트) */
    size: number;
    /** 존재 여부 */
    exists: boolean;
}

/**
 * 파일 읽기
 */
export async function readFile(filePath: string): Promise<FileReadResult> {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.readFile(absolutePath, 'utf-8');
        const stats = await fs.stat(absolutePath);

        return {
            path: absolutePath,
            content,
            size: stats.size,
            exists: true,
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {
                path: path.resolve(filePath),
                content: '',
                size: 0,
                exists: false,
            };
        }
        throw error;
    }
}

/**
 * 여러 파일 읽기
 */
export async function readFiles(filePaths: string[]): Promise<FileReadResult[]> {
    const results = await Promise.all(filePaths.map((p) => readFile(p)));
    return results;
}

/**
 * 디렉토리 내용 읽기
 */
export async function readDirectory(dirPath: string): Promise<string[]> {
    try {
        const absolutePath = path.resolve(dirPath);
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });

        return entries.map((entry) => {
            const prefix = entry.isDirectory() ? '📁 ' : '📄 ';
            return `${prefix}${entry.name}`;
        });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(ko.errors.fileNotFound.replace('{path}', dirPath));
        }
        throw error;
    }
}

/**
 * 파일이 존재하는지 확인
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(path.resolve(filePath));
        return true;
    } catch {
        return false;
    }
}

/**
 * 파일 정보 가져오기
 */
export async function getFileInfo(filePath: string) {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);

    return {
        path: absolutePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modified: stats.mtime,
        created: stats.birthtime,
    };
}

/**
 * 파일 내용을 컨텍스트 형식으로 변환
 */
export function formatFileForContext(result: FileReadResult, maxSize: number = 10000): string {
    if (!result.exists) {
        return `파일을 찾을 수 없습니다: ${result.path}`;
    }

    const relativePath = path.relative(process.cwd(), result.path);
    let content = result.content;

    // 파일이 너무 크면 잘라내기
    if (content.length > maxSize) {
        content = content.substring(0, maxSize) + '\n\n... (파일이 너무 커서 잘렸습니다)';
    }

    return `\`\`\`
파일: ${relativePath}
크기: ${result.size} 바이트

${content}
\`\`\``;
}

/**
 * 여러 파일을 컨텍스트 형식으로 변환
 */
export function formatFilesForContext(results: FileReadResult[]): string {
    return results.map((r) => formatFileForContext(r)).join('\n\n---\n\n');
}
