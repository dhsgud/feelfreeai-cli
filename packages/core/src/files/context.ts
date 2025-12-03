import { FileReadResult } from './reader';

/**
 * 컨텍스트에 포함된 파일
 */
export interface ContextFile {
    /** 파일 경로 */
    path: string;
    /** 파일 내용 */
    content: string;
    /** 추가된 시간 */
    addedAt: Date;
}

/**
 * 컨텍스트 관리자
 */
export class ContextManager {
    private files: Map<string, ContextFile> = new Map();
    private maxContextSize: number;

    constructor(maxContextSize: number = 50000) {
        this.maxContextSize = maxContextSize;
    }

    /**
     * 파일 추가
     */
    addFile(result: FileReadResult): void {
        if (!result.exists) {
            return;
        }

        this.files.set(result.path, {
            path: result.path,
            content: result.content,
            addedAt: new Date(),
        });
    }

    /**
     * 파일 제거
     */
    removeFile(filePath: string): void {
        this.files.delete(filePath);
    }

    /**
     * 모든 파일 제거
     */
    clearAll(): void {
        this.files.clear();
    }

    /**
     * 파일 목록 가져오기
     */
    getFiles(): ContextFile[] {
        return Array.from(this.files.values());
    }

    /**
     * 컨텍스트 크기 계산
     */
    getContextSize(): number {
        let size = 0;
        for (const file of this.files.values()) {
            size += file.content.length;
        }
        return size;
    }

    /**
     * 컨텍스트 텍스트 생성
     */
    getContextText(): string {
        const files = this.getFiles();

        if (files.length === 0) {
            return '';
        }

        let context = '## 참조 파일\n\n';

        for (const file of files) {
            context += `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
        }

        // 최대 크기 초과 시 자르기
        if (context.length > this.maxContextSize) {
            context = context.substring(0, this.maxContextSize);
            context += '\n\n... (컨텍스트가 너무 커서 잘렸습니다)';
        }

        return context;
    }

    /**
     * 파일 개수
     */
    getFileCount(): number {
        return this.files.size;
    }

    /**
     * 특정 파일이 포함되어 있는지 확인
     */
    hasFile(filePath: string): boolean {
        return this.files.has(filePath);
    }
}
