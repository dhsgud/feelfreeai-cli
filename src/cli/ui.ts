import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

/**
 * 그라디언트 색상 팔레트
 */
const PRIMARY_GRADIENT = gradient(['#00F5FF', '#00BFFF', '#1E90FF']);
const SUCCESS_GRADIENT = gradient(['#00FF7F', '#00FA9A', '#32CD32']);
const ACCENT_GRADIENT = gradient(['#FF10F0', '#C724B1', '#8E44AD']);

/**
 * 화려한 환영 메시지 표시
 */
export function showWelcome(): void {
    console.clear();

    const logo = `
     ███████╗███████╗███████╗██╗         ███████╗██████╗ ███████╗███████╗
     ██╔════╝██╔════╝██╔════╝██║         ██╔════╝██╔══██╗██╔════╝██╔════╝
     █████╗  █████╗  █████╗  ██║         █████╗  ██████╔╝█████╗  █████╗  
     ██╔══╝  ██╔══╝  ██╔══╝  ██║         ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  
     ██║     ███████╗███████╗███████╗    ██║     ██║  ██║███████╗███████╗
     ╚═╝     ╚══════╝╚══════╝╚══════╝    ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝
    `;

    console.log(PRIMARY_GRADIENT(logo));

    const version = 'v0.2.0';
    const tagline = '🚀 AI 기반 코딩 어시스턴트';

    const welcomeBox = boxen(
        chalk.bold.white(`${tagline}\n`) +
        chalk.gray(`버전: ${version}\n`) +
        chalk.cyan('━'.repeat(50)) + '\n' +
        chalk.white('✨ Gemini & llama.cpp 지원\n') +
        chalk.white('🇰🇷 한글 친화적 인터페이스\n') +
        chalk.white('⚡ 실시간 스트리밍 응답'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'cyan',
            backgroundColor: '#1a1a2e',
        }
    );

    console.log(welcomeBox);
    console.log();
}

/**
 * 프로바이더 준비 완료 메시지
 */
export function showProviderReady(providerName: string): void {
    const message = `✨ ${providerName} 준비 완료`;
    console.log(boxen(SUCCESS_GRADIENT(message), {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        borderStyle: 'round',
        borderColor: 'green',
        margin: { top: 1, bottom: 1 },
    }));
}

/**
 * AI 응답 헤더 표시
 */
export function showAssistantHeader(): void {
    const header = ACCENT_GRADIENT('━━━ 🤖 AI Assistant 응답 ━━━');
    console.log(`\n${header}\n`);
}

/**
 * 사용자 프롬프트 문자열 반환
 */
export function getUserPrompt(): string {
    return chalk.bold.cyan('You') + chalk.gray(' › ');
}

/**
 * 로딩 스피너 프레임
 */


/**
 * 성공 메시지 표시
 */
export function showSuccess(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
}

/**
 * 경고 메시지 표시
 */
export function showWarning(message: string): void {
    console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * 에러 메시지 표시
 */
export function showError(message: string): void {
    console.log(chalk.red(`✗ ${message}`));
}

/**
 * 정보 메시지 표시
 */
export function showInfo(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * 파일 추가 성공 메시지
 */
export function showFileAdded(filePath: string): void {
    console.log(chalk.green(`📁 ${filePath} ${chalk.gray('컨텍스트에 추가됨')}`));
}

/**
 * 스트리밍 청크 포맷
 */
export function formatStreamChunk(text: string): string {
    return chalk.white(text);
}

/**
 * 명령어 실행 헤더
 */
export function showCommandHeader(command: string): void {
    const header = ACCENT_GRADIENT(`━━━ 🔧 명령어 실행: ${command} ━━━`);
    console.log(`\n${header}\n`);
}

/**
 * 컨텍스트 상태 헤더
 */
export function showContextHeader(fileCount: number, totalSize: number): void {
    const sizeInKB = (totalSize / 1024).toFixed(2);
    console.log(chalk.bold.cyan(`\n📦 컨텍스트 상태`));
    console.log(chalk.gray(`  파일 수: ${fileCount}`));
    console.log(chalk.gray(`  전체 크기: ${sizeInKB} KB\n`));
}

/**
 * 도움말 섹션 헤더
 */
export function showHelpSection(title: string): void {
    console.log(chalk.bold.cyan(`\n${title}`));
    console.log(chalk.cyan('━'.repeat(50)));
}

/**
 * 도움말 항목
 */
export function showHelpItem(command: string, description: string): void {
    console.log(`  ${chalk.yellow(command.padEnd(20))} ${chalk.gray(description)}`);
}

/**
 * 종료 메시지
 */
export function showGoodbye(): void {
    const message = boxen(
        SUCCESS_GRADIENT('👋 감사합니다! 다음에 또 만나요!'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
        }
    );
    console.log(`\n${message}\n`);
}

/**
 * 도구 실행 표시
 */
export function showToolExecution(toolName: string, args: any): void {
    console.log(chalk.magenta(`\n🔧 도구 실행: ${toolName}`));
    console.log(chalk.gray(`  인자: ${JSON.stringify(args, null, 2)}`));
}

/**
 * 자동완성 제안 목록 렌더링
 */
export function renderSuggestions(suggestions: { name: string, description?: string }[], selectedIndex: number = 0): void {
    const NAME_WIDTH = 15; // 명령어 이름 너비 고정

    suggestions.forEach((item, index) => {
        process.stdout.write('\n'); // 한 줄 아래로
        process.stdout.write('\x1B[2K'); // 현재 줄 지우기

        const isSelected = index === selectedIndex;

        // 선택된 항목 스타일링 (프리미엄 느낌의 보라/핑크)
        // 이미지와 유사하게: 선택된 항목은 핑크색 텍스트, 비선택은 흰색/회색
        const selectionColor = chalk.hex('#FF79C6'); // Dracula Pink 느낌
        const descriptionColor = chalk.gray;

        let lineContent = '';

        if (isSelected) {
            // 선택된 경우: "> 명령어   설명" (명령어는 핑크, 설명은 밝은 회색)
            const prefix = selectionColor('❯ ');
            const name = selectionColor.bold(item.name.padEnd(NAME_WIDTH));
            const description = chalk.white(item.description || '');
            lineContent = `${prefix}${name} ${description}`;
        } else {
            // 선택되지 않은 경우: "  명령어   설명" (명령어는 흰색, 설명은 어두운 회색)
            const prefix = '  ';
            const name = chalk.white(item.name.padEnd(NAME_WIDTH));
            const description = descriptionColor(item.description || '');
            lineContent = `${prefix}${name} ${description}`;
        }

        process.stdout.write(`\r${lineContent}`);
    });

    // 원래 입력 라인으로 커서 복귀
    process.stdout.write(`\x1B[${suggestions.length}A`);
}

/**
 * 자동완성 제안 목록 지우기
 */
export function clearSuggestions(count: number): void {
    for (let i = 0; i < count; i++) {
        process.stdout.write('\n');     // 아래로 이동
        process.stdout.write('\x1B[2K'); // 줄 지우기
    }

    // 다시 원래 위치로 복귀
    process.stdout.write(`\x1B[${count}A`);
}
