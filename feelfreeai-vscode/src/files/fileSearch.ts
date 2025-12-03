import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 워크스페이스에서 파일 검색
 */
export async function searchWorkspaceFiles(query: string, maxResults: number = 50): Promise<vscode.Uri[]> {
    if (!query || query.trim().length === 0) {
        return [];
    }

    // 쿼리를 glob 패턴으로 변환
    const pattern = `**/*${query}*`;

    try {
        const files = await vscode.workspace.findFiles(
            pattern,
            '**/node_modules/**', // node_modules 제외
            maxResults
        );

        return files;
    } catch (error) {
        console.error('Error searching files:', error);
        return [];
    }
}

/**
 * 파일 내용 읽기
 */
export async function getFileContent(uri: vscode.Uri): Promise<string> {
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        return document.getText();
    } catch (error) {
        console.error('Error reading file:', error);
        return '';
    }
}

/**
 * 파일 경로를 워크스페이스 상대 경로로 변환
 */
export function getRelativePath(uri: vscode.Uri): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
        return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
    }
    return uri.fsPath;
}

/**
 * 디렉토리인지 확인
 */
export async function isDirectory(uri: vscode.Uri): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return stat.type === vscode.FileType.Directory;
    } catch {
        return false;
    }
}

/**
 * 디렉토리의 파일 목록 가져오기
 */
export async function getDirectoryFiles(uri: vscode.Uri): Promise<vscode.Uri[]> {
    try {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        const files: vscode.Uri[] = [];

        for (const [name, type] of entries) {
            if (type === vscode.FileType.File) {
                files.push(vscode.Uri.joinPath(uri, name));
            }
        }

        return files;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
}
