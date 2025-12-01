import readline from 'readline';
import fs from 'fs';

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ko } from '../config/locales/ko';
import { ProviderFactory } from '../providers/factory';
import { BaseProvider } from '../providers/base';
import { ProviderType, Message } from '../config/types';
import { getSystemPromptWithContext } from '../config/prompts/korean';
import { readProjectContext } from '../config/project';
import { ContextManager } from '../files/context';
import { preprocessInput } from '../files/parser';
import { readFile } from '../files/reader';
import {
    createSession,
    saveSession,
    loadSession,
    listSessions,
    findSessionByName,
} from '../conversation/persistence';
import {
    executeCommand,
    checkCommandSafety,
    formatCommandForContext,
    summarizeCommandResult,
} from '../files/command';
import {
    showWelcome,
    showProviderReady,
    showAssistantHeader,
    getUserPrompt,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    showFileAdded,
    formatStreamChunk,
    showCommandHeader,
    showContextHeader,
    showHelpSection,
    showHelpItem,
    showGoodbye,
} from './ui';

/**
 * REPL 옵션
 */
export interface ReplOptions {
    provider?: ProviderType;
    continueSession?: boolean;
    streaming?: boolean;
    systemPrompt?: string;
    systemPromptFile?: string;
    appendSystemPrompt?: string;
}

/**
 * REPL 상태
 */
interface ReplState {
    provider: BaseProvider;
    providerType: ProviderType;
    messages: Message[];
    systemPrompt: string;
    streaming: boolean;
    contextManager: ContextManager;
}

const COMMANDS = [
    '/help',
    '/clear',
    '/files',
    '/context',
    '/save',
    '/load',
    '/sessions',
    '/exit',
    '/quit',
];

function completer(line: string) {
    // Command completion
    if (line.startsWith('/')) {
        const hits = COMMANDS.filter((c) => c.startsWith(line));
        return [hits.length ? hits : COMMANDS, line];
    }

    // File completion for @
    const lastWordMatch = line.match(/(@\S*)$/);
    if (lastWordMatch) {
        const partial = lastWordMatch[1];

        try {
            const cwd = process.cwd();
            const files = fs.readdirSync(cwd);

            const candidates = files
                .filter(f => !f.startsWith('.') && f !== 'node_modules')
                .map(f => '@' + f);

            const hits = candidates.filter(c => c.startsWith(partial));
            return [hits.length ? hits : candidates, partial];
        } catch (error) {
            return [[], partial];
        }
    }

    return [[], line];
}

/**
 * 대화형 REPL 시작
 */
export async function startRepl(options: ReplOptions): Promise<void> {
    // 화려한 환영 메시지 표시
    showWelcome();
    showInfo('도움말을 보려면 /help를 입력하세요. (팁: / 또는 @ 입력 후 Tab을 누르면 자동완성이 됩니다)');
    console.log();

    try {
        const provider = await ProviderFactory.createFromConfig(options.provider);
        showProviderReady(provider.name);

        const projectContext = await readProjectContext();
        if (projectContext) {
            showInfo('📁 프로젝트 컨텍스트 로드됨');
        }

        const systemPrompt = getSystemPromptWithContext(
            projectContext ?? undefined,
            options.systemPrompt
        );

        const state: ReplState = {
            provider,
            providerType: options.provider ?? 'gemini',
            messages: [],
            systemPrompt,
            streaming: options.streaming !== false,
            contextManager: new ContextManager(),
        };

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: getUserPrompt(),
            completer,
        });

        rl.prompt();

        rl.on('line', async (line) => {
            const input = line.trim();

            if (!input) {
                rl.prompt();
                return;
            }

            if (input.startsWith('/')) {
                await handleCommand(input, state, rl);
                rl.prompt();
                return;
            }

            await handleMessage(input, state);
            rl.prompt();
        });

        rl.on('close', () => {
            showGoodbye();
            process.exit(0);
        });
    } catch (error) {
        console.error(chalk.red('오류:'), error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function handleCommand(
    input: string,
    state: ReplState,
    rl: readline.Interface
): Promise<void> {
    const parts = input.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === '') {
        showHelp();
        return;
    }

    switch (command) {
        case 'help':
            showHelp();
            break;
        case 'exit':
        case 'quit':
            rl.close();
            break;
        case 'clear':
            state.messages = [];
            state.contextManager.clearAll();
            showSuccess(ko.session.cleared);
            break;
        case 'files':
        case 'context':
            showContext(state);
            break;
        case 'save':
            await handleSave(state, args);
            break;
        case 'load':
            await handleLoad(state, args);
            break;
        case 'sessions':
            await handleListSessions();
            break;
        default:
            console.log(chalk.red(`${ko.errors.invalidCommand}: /${command}`));
            console.log(chalk.gray('사용 가능한 명령어를 보려면 /help를 입력하세요.'));
    }
}

async function handleMessage(input: string, state: ReplState): Promise<void> {
    const parsed = preprocessInput(input);

    // 파일 참조 처리
    if (parsed.type === 'file-reference' && parsed.files) {
        for (const file of parsed.files) {
            try {
                const result = await readFile(file);
                if (result.exists) {
                    state.contextManager.addFile(result);
                    showFileAdded(file);
                } else {
                    showError(`파일을 찾을 수 없습니다: ${file}`);
                }
            } catch (error) {
                showError(`파일 읽기 실패: ${file}`);
            }
        }
    }

    // 명령어 실행
    if (parsed.type === 'command' && parsed.command) {
        await handleCommandExecution(parsed.command, state);
        return;
    }

    const messageContent = parsed.processed || parsed.original;
    if (!messageContent || messageContent.trim().length === 0) {
        return;
    }

    const userMessage: Message = {
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
    };
    state.messages.push(userMessage);

    try {
        showAssistantHeader();

        let enhancedSystemPrompt = state.systemPrompt;
        const contextText = state.contextManager.getContextText();
        if (contextText) {
            enhancedSystemPrompt += '\n\n' + contextText;
        }

        let responseText = '';

        if (state.streaming) {
            const response = await state.provider.stream(
                state.messages,
                enhancedSystemPrompt,
                (chunk) => {
                    if (!chunk.done) {
                        const formattedChunk = formatStreamChunk(chunk.text);
                        process.stdout.write(formattedChunk);
                        responseText += chunk.text;
                    }
                }
            );
            console.log('\n');
            responseText = response.text;
        } else {
            const response = await state.provider.chat(state.messages, enhancedSystemPrompt);
            console.log(response.text);
            console.log();
            responseText = response.text;
        }

        const assistantMessage: Message = {
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
        };
        state.messages.push(assistantMessage);
    } catch (error) {
        console.log();
        showError(error instanceof Error ? error.message : String(error));
        console.log();
        state.messages.pop();
    }
}

async function handleCommandExecution(command: string, state: ReplState): Promise<void> {
    const safety = checkCommandSafety(command);

    if (safety.isDangerous) {
        console.log();
        showError(`위험한 명령어 감지! ${safety.reason}`);
        showWarning('이 명령어는 실행되지 않았습니다.');
        console.log();
        return;
    }

    if (safety.needsWarning) {
        console.log();
        showWarning(`주의 필요! ${safety.reason}`);

        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '계속 진행하시겠습니까?',
                default: false,
            },
        ]);

        if (!answer.confirm) {
            console.log(chalk.gray('명령어 실행이 취소되었습니다.\n'));
            return;
        }
    }

    showCommandHeader(command);

    try {
        const result = await executeCommand(command);
        const summary = summarizeCommandResult(result);

        console.log(chalk.gray(summary));

        if (result.stdout) {
            console.log(chalk.bold('\n출력:'));
            console.log(result.stdout);
        }

        if (result.stderr) {
            console.log(chalk.yellow('\n경고/에러:'));
            console.log(result.stderr);
        }

        console.log();

        const formattedResult = formatCommandForContext(result);
        state.contextManager.addFile({
            path: `[Command: ${command}]`,
            content: formattedResult,
            size: formattedResult.length,
            exists: true,
        });

        showSuccess('명령어 결과가 컨텍스트에 추가되었습니다.');
        console.log();
    } catch (error) {
        console.error(chalk.red('\n명령어 실행 실패:'), error instanceof Error ? error.message : error);
        console.log();
    }
}

function showHelp(): void {
    showHelpSection(ko.help.title);

    showHelpSection('슬래시 명령어');
    showHelpItem('/help', '이 도움말 표시');
    showHelpItem('/clear', '대화 내용 및 컨텍스트 지우기');
    showHelpItem('/files', '로드된 파일 목록 보기');
    showHelpItem('/context', '현재 컨텍스트 상태 보기');
    showHelpItem('/save [이름]', '현재 대화 저장');
    showHelpItem('/load [이름]', '저장된 대화 불러오기');
    showHelpItem('/sessions', '저장된 세션 목록 보기');
    showHelpItem('/exit', '종료');

    showHelpSection('특수 문법');
    showHelpItem('@파일명', '파일을 컨텍스트에 추가');
    console.log(chalk.dim('              예: @README.md 이 프로젝트가 뭐하는 거야?'));
    showHelpItem('!명령어', '셸 명령어 실행 및 결과를 컨텍스트에 추가');
    console.log(chalk.dim('              예: !ls -la 현재 디렉토리를 분석해줘'));
    console.log();
}

function showContext(state: ReplState): void {
    const files = state.contextManager.getFiles();
    const count = state.contextManager.getFileCount();
    const size = state.contextManager.getContextSize();

    showContextHeader(count, size);

    if (count === 0) {
        showWarning('컨텍스트에 로드된 파일이 없습니다.');
        console.log(chalk.dim('@파일명 문법을 사용하여 파일을 추가하세요.\n'));
    } else {
        console.log(chalk.bold.cyan('로드된 파일:'));
        for (const file of files) {
            console.log(chalk.green(`  ✓ ${file.path}`));
            console.log(chalk.dim(`    크기: ${file.content.length.toLocaleString()} 문자`));
        }
        console.log();
    }
}

async function handleSave(state: ReplState, args: string[]): Promise<void> {
    if (state.messages.length === 0) {
        console.log(chalk.yellow('저장할 대화가 없습니다.'));
        return;
    }

    let sessionName = args.join(' ').trim();

    if (!sessionName) {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: '세션 이름을 입력하세요 (선택사항):',
            },
        ]);
        sessionName = answer.name.trim() || undefined;
    }

    const session = createSession(state.messages, state.providerType, sessionName);
    await saveSession(session);

    console.log(chalk.green(`\n✅ 대화가 저장되었습니다!`));
    console.log(chalk.gray(`세션 ID: ${session.id}`));
    if (sessionName) {
        console.log(chalk.gray(`이름: ${sessionName}`));
    }
    console.log();
}

async function handleLoad(state: ReplState, args: string[]): Promise<void> {
    const sessions = await listSessions();

    if (sessions.length === 0) {
        console.log(chalk.yellow('저장된 세션이 없습니다.'));
        return;
    }

    if (args.length > 0) {
        const query = args.join(' ').trim();
        let session = await findSessionByName(query);
        if (!session) {
            session = await loadSession(query);
        }

        if (session) {
            state.messages = session.messages;
            console.log(chalk.green(`\n✅ 세션을 불러왔습니다!`));
            console.log(chalk.gray(`세션 ID: ${session.id}`));
            if (session.name) {
                console.log(chalk.gray(`이름: ${session.name}`));
            }
            console.log(chalk.gray(`메시지 수: ${session.messages.length}`));
            console.log();
        } else {
            console.log(chalk.red(`세션을 찾을 수 없습니다: ${query}`));
        }
        return;
    }

    const choices = sessions.map((s) => ({
        name: `${s.name || '(이름 없음)'} - ${s.messages.length}개 메시지 (${formatDate(s.updatedAt)})`,
        value: s.id,
    }));

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'sessionId',
            message: '불러올 세션을 선택하세요:',
            choices,
            pageSize: 10,
        },
    ]);

    const session = await loadSession(answer.sessionId);
    if (session) {
        state.messages = session.messages;
        console.log(chalk.green(`\n✅ 세션을 불러왔습니다!`));
        console.log(chalk.gray(`메시지 수: ${session.messages.length}\n`));
    }
}

async function handleListSessions(): Promise<void> {
    const sessions = await listSessions();

    if (sessions.length === 0) {
        console.log(chalk.yellow('\n저장된 세션이 없습니다.\n'));
        return;
    }

    console.log(chalk.bold.blue('\n💾 저장된 세션\n'));
    for (const session of sessions) {
        console.log(chalk.bold(session.name || '(이름 없음)'));
        console.log(chalk.gray(`  ID: ${session.id}`));
        console.log(chalk.gray(`  메시지: ${session.messages.length}개`));
        console.log(chalk.gray(`  마지막 수정: ${formatDate(session.updatedAt)}`));
        console.log(chalk.gray(`  프로바이더: ${session.provider}`));
        console.log();
    }
}

function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}일 전`;
    } else if (hours > 0) {
        return `${hours}시간 전`;
    } else if (minutes > 0) {
        return `${minutes}분 전`;
    } else {
        return '방금 전';
    }
}
