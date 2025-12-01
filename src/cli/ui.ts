import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

/**
 * 그라디언트 색상 팔레트
 */
const PRIMARY_GRADIENT = gradient(['#00F5FF', '#00BFFF', '#1E90FF']);
const SUCCESS_GRADIENT = gradient(['#00FF7F', '#00FA9A', '#32CD32']);
const WARNING_GRADIENT = gradient(['#FFD700', '#FFA500', '#FF8C00']);
const ERROR_GRADIENT = gradient(['#FF6B6B', '#FF4757', '#EE5A6F']);
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
    const header = '╭─────────────────────────────────────────────────────────────╮';
    const title = '│ 🤖 FeelFree AI                                              │';
    const footer = '╰─────────────────────────────────────────────────────────────╯';

    console.log();
    console.log(PRIMARY_GRADIENT(header));
    console.log(PRIMARY_GRADIENT(title));
    console.log(PRIMARY_GRADIENT(footer));
    console.log();
}

/**
 * 사용자 입력 프롬프트 꾸미기
 */
export function getUserPrompt(): string {
    return chalk.bold.cyan('You') + chalk.gray(' › ');
}

/**
 * 로딩 스피너 프레임
 */
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;

/**
 * 로딩 애니메이션 시작
 */
export function showThinking(): ReturnType<typeof setInterval> {
    process.stdout.write('\n');
    return setInterval(() => {
        const frame = spinnerFrames[spinnerIndex];
        process.stdout.write(`\r${ACCENT_GRADIENT(frame)} ${chalk.dim('생각 중...')}`);
        spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 80);
}

/**
 * 로딩 애니메이션 중지
 */
export function stopThinking(timer: ReturnType<typeof setInterval>): void {
    clearInterval(timer);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

/**
 * 성공 메시지
 */
export function showSuccess(message: string): void {
    console.log(SUCCESS_GRADIENT(`✓ ${message}`));
}

/**
 * 경고 메시지
 */
export function showWarning(message: string): void {
    console.log(WARNING_GRADIENT(`⚠ ${message}`));
}

/**
 * 에러 메시지
 */
export function showError(message: string): void {
    console.log(ERROR_GRADIENT(`✖ ${message}`));
}

/**
 * 정보 메시지
 */
export function showInfo(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * 구분선
 */
export function showDivider(char: string = '─', color: 'gray' | 'cyan' | 'yellow' | 'red' | 'green' | 'blue' = 'gray'): void {
    const width = process.stdout.columns || 80;
    const line = char.repeat(width);
    const chalkColor = chalk[color];
    console.log(chalkColor(line));
}

/**
 * 파일 추가 알림
 */
export function showFileAdded(filename: string): void {
    console.log(chalk.green('  ✓') + chalk.bold(` ${filename} `) + chalk.dim('추가됨'));
}

/**
 * 스트리밍 텍스트 포맷팅
 */
export function formatStreamChunk(text: string): string {
    return text;
}

/**
 * 명령어 실행 헤더
 */
export function showCommandHeader(command: string): void {
    console.log();
    console.log(boxen(
        chalk.bold.blue('⚡ 명령어 실행') + '\n' +
        chalk.gray(command),
        {
            padding: { left: 1, right: 1, top: 0, bottom: 0 },
            borderStyle: 'round',
            borderColor: 'blue',
            margin: { top: 0, bottom: 1 },
        }
    ));
}

/**
 * 세션 정보 표시
 */
export function showSessionInfo(sessionName: string, messageCount: number): void {
    const info = `💾 ${sessionName || '(이름 없음)'} · ${messageCount}개 메시지`;
    console.log(boxen(PRIMARY_GRADIENT(info), {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        borderStyle: 'round',
        borderColor: 'cyan',
        margin: { top: 1, bottom: 1 },
    }));
}

/**
 * 컨텍스트 상태 헤더
 */
export function showContextHeader(fileCount: number, totalSize: number): void {
    const header = `📁 컨텍스트 · ${fileCount}개 파일 · ${totalSize.toLocaleString()}자`;
    console.log();
    console.log(PRIMARY_GRADIENT(header));
    console.log(chalk.gray('─'.repeat(60)));
}

/**
 * 도움말 섹션 헤더
 */
export function showHelpSection(title: string): void {
    console.log();
    console.log(chalk.bold.cyan(`▸ ${title}`));
}

/**
 * 도움말 항목
 */
export function showHelpItem(command: string, description: string): void {
    console.log(
        chalk.yellow(`  ${command.padEnd(20)}`) +
        chalk.gray(description)
    );
}

/**
 * 작별 메시지
 */
export function showGoodbye(): void {
    console.log();
    const goodbye = '👋 안녕히 가세요!';
    console.log(boxen(ACCENT_GRADIENT(goodbye), {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        borderStyle: 'round',
        borderColor: 'magenta',
        margin: { top: 1, bottom: 1 },
    }));
}

/**
 * diff 스타일 코드 블록
 */
export function showCodeDiff(oldLine: string, newLine: string, lineNumber: number): void {
    console.log(chalk.gray(`  ${lineNumber}`) + chalk.red(' - ') + chalk.red(oldLine));
    console.log(chalk.gray(`  ${lineNumber}`) + chalk.green(' + ') + chalk.green(newLine));
}

/**
 * 프로그레스 바
 */
export function showProgress(current: number, total: number, label: string = ''): void {
    const percentage = Math.floor((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.floor((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(
        `\r${chalk.cyan(bar)} ${chalk.bold(`${percentage}%`)} ${chalk.dim(label)}`
    );

    if (current === total) {
        process.stdout.write('\n');
    }
}

/**
 * 테이블 헤더
 */
export function showTableHeader(columns: string[]): void {
    const header = columns.map(col => chalk.bold.cyan(col)).join(' │ ');
    console.log(header);
    console.log(chalk.gray('─'.repeat(80)));
}

/**
 * 테이블 행
 */
export function showTableRow(values: string[]): void {
    const row = values.map(val => val).join(' │ ');
    console.log(row);
}
