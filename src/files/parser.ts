/**
 * @filename 문법 파싱
 */
export function parseFileReferences(input: string): {
    hasReferences: boolean;
    files: string[];
    cleanedInput: string;
} {
    // @파일명 패턴 찾기
    const fileRefPattern = /@([^\s]+)/g;
    const matches = input.matchAll(fileRefPattern);
    const files: string[] = [];

    for (const match of matches) {
        files.push(match[1]);
    }

    // @파일명을 제거한 깨끗한 입력
    const cleanedInput = input.replace(fileRefPattern, '').trim();

    return {
        hasReferences: files.length > 0,
        files,
        cleanedInput,
    };
}

/**
 * !명령어 문법 파싱
 */
export function parseCommandReference(input: string): {
    isCommand: boolean;
    command: string;
} {
    if (input.startsWith('!')) {
        return {
            isCommand: true,
            command: input.slice(1).trim(),
        };
    }

    return {
        isCommand: false,
        command: '',
    };
}

/**
 * 입력 전처리
 */
export function preprocessInput(input: string): {
    type: 'message' | 'command' | 'file-reference';
    original: string;
    processed: string;
    files?: string[];
    command?: string;
} {
    // 슬래시 명령어는 이미 다른 곳에서 처리됨
    if (input.startsWith('/')) {
        return {
            type: 'message',
            original: input,
            processed: input,
        };
    }

    // Bash 명령어 감지
    const cmdRef = parseCommandReference(input);
    if (cmdRef.isCommand) {
        return {
            type: 'command',
            original: input,
            processed: input,
            command: cmdRef.command,
        };
    }

    // 파일 참조 감지
    const fileRef = parseFileReferences(input);
    if (fileRef.hasReferences) {
        return {
            type: 'file-reference',
            original: input,
            processed: fileRef.cleanedInput,
            files: fileRef.files,
        };
    }

    // 일반 메시지
    return {
        type: 'message',
        original: input,
        processed: input,
    };
}
