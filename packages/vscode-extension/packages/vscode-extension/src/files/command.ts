import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 명령어 실행 결과
 */
export interface CommandResult {
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    success: boolean;
}

/**
 * 위험한 명령어 패턴
 */
const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//,  // rm -rf /
    /:\(\)\{\s*:\|:&\s*\};:/,  // fork bomb
    />\s*\/dev\/sd/,  // 디스크 직접 쓰기
    /mkfs/,  // 파일시스템 포맷
    /dd\s+if=/,  // dd 명령어
    /format\s+[a-z]:/i,  // Windows format
];

/**
 * 주의가 필요한 명령어 패턴
 */
const WARNING_PATTERNS = [
    /rm\s+-r/,  // rm -r
    /rm\s+.*\*/,  // rm with wildcard
    /del\s+\/[sq]/i,  // Windows del with flags
    /npm\s+install\s+-g/,  // global npm install
    /sudo/,  // sudo 명령어
];

/**
 * 명령어 위험도 체크
 */
export function checkCommandSafety(command: string): {
    isDangerous: boolean;
    needsWarning: boolean;
    reason?: string;
} {
    // 위험한 명령어 체크
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            return {
                isDangerous: true,
                needsWarning: true,
                reason: '이 명령어는 시스템에 심각한 손상을 줄 수 있습니다.',
            };
        }
    }

    // 주의가 필요한 명령어 체크
    for (const pattern of WARNING_PATTERNS) {
        if (pattern.test(command)) {
            return {
                isDangerous: false,
                needsWarning: true,
                reason: '이 명령어는 주의가 필요합니다.',
            };
        }
    }

    return {
        isDangerous: false,
        needsWarning: false,
    };
}

/**
 * Bash 명령어 실행
 */
export async function executeCommand(
    command: string,
    timeout: number = 30000
): Promise<CommandResult> {
    try {
        const { stdout, stderr } = await execAsync(command, {
            timeout,
            maxBuffer: 1024 * 1024, // 1MB
            shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
        });

        return {
            command,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: 0,
            success: true,
        };
    } catch (error: any) {
        return {
            command,
            stdout: error.stdout ? error.stdout.trim() : '',
            stderr: error.stderr ? error.stderr.trim() : error.message,
            exitCode: error.code || 1,
            success: false,
        };
    }
}

/**
 * 명령어 결과를 AI 컨텍스트 형식으로 포맷
 */
export function formatCommandForContext(result: CommandResult): string {
    const lines = [
        '```',
        `Command: ${result.command}`,
        `Exit Code: ${result.exitCode}`,
        '',
    ];

    if (result.stdout) {
        lines.push('Output:');
        lines.push(result.stdout);
        lines.push('');
    }

    if (result.stderr) {
        lines.push('Errors:');
        lines.push(result.stderr);
        lines.push('');
    }

    if (!result.stdout && !result.stderr) {
        lines.push('(No output)');
        lines.push('');
    }

    lines.push('```');

    return lines.join('\n');
}

/**
 * 명령어 결과의 간단한 요약
 */
export function summarizeCommandResult(result: CommandResult): string {
    const status = result.success ? '✅ 성공' : '❌ 실패';
    const outputLines = result.stdout.split('\n').length;
    const errorLines = result.stderr.split('\n').filter((l) => l.trim()).length;

    let summary = `${status} (종료 코드: ${result.exitCode})`;

    if (outputLines > 0) {
        summary += ` - ${outputLines}줄 출력`;
    }

    if (errorLines > 0) {
        summary += ` - ${errorLines}줄 에러`;
    }

    return summary;
}
