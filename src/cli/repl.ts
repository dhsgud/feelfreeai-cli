import fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import readline from 'readline';
import { ContextManager } from '../files/context';
import { getSystemPromptWithContext } from '../config/prompts/korean';
import { readProjectContext } from '../config/project';
import { ProviderType, Message } from '../config/types';
import { ProviderFactory } from '../providers/factory';
import { BaseProvider } from '../providers/base';
import { ko } from '../config/locales/ko';
import {
    handleSave,
    handleLoad,
    handleListSessions,
} from './repl-handlers';
import {
    getUserPrompt,
    showWelcome,
    showSuccess,
    showAssistantHeader,
    showProviderReady,
} from './ui';

export interface ReplOptions {
    provider?: ProviderType;
    continueSession?: boolean;
    streaming?: boolean;
    systemPrompt?: string;
    systemPromptFile?: string;
    appendSystemPrompt?: string;
}

interface ReplState {
    provider: BaseProvider;
    providerType: ProviderType;
    messages: Message[];
    systemPrompt: string;
    streaming: boolean;
    contextManager: ContextManager;
}

interface CommandDef {
    name: string;
    description: string;
}

const COMMANDS: CommandDef[] = [
    { name: '/about', description: 'Show version info' },
    { name: '/bug', description: 'Submit a bug report' },
    { name: '/chat', description: 'Manage conversation history' },
    { name: '/clear', description: 'Clear the screen and conversation history' },
    { name: '/compress', description: 'Compresses the context by replacing it with a summary' },
    { name: '/copy', description: 'Copy the last result or code snippet to clipboard' },
    { name: '/docs', description: 'Open full Gemini CLI documentation in your browser' },
    { name: '/files', description: 'Show loaded files' },
    { name: '/context', description: 'Check current context status' },
    { name: '/save', description: 'Save current session' },
    { name: '/load', description: 'Load a saved session' },
    { name: '/sessions', description: 'List saved sessions' },
    { name: '/exit', description: 'Exit the program' },
    { name: '/quit', description: 'Exit the program' },
    { name: '/agent', description: 'Activate Agentic Mode' },
];

export async function startRepl(options: ReplOptions) {
    console.clear();
    showWelcome();

    const spinner = ora('프로바이더 초기화 중...').start();

    try {
        const provider = await ProviderFactory.createFromConfig(options.provider);
        spinner.succeed(`${provider.name} 프로바이더 준비 완료`);
        showProviderReady(provider.name);

        const projectContext = await readProjectContext();

        let customPrompt = options.systemPrompt;
        if (options.systemPromptFile) {
            try {
                customPrompt = fs.readFileSync(options.systemPromptFile, 'utf-8');
            } catch (error) {
                console.warn(chalk.yellow(`경고: 시스템 프롬프트 파일을 읽을 수 없습니다.`));
            }
        }

        if (options.appendSystemPrompt) {
            customPrompt = customPrompt
                ? `${customPrompt}\n\n${options.appendSystemPrompt}`
                : options.appendSystemPrompt;
        }

        const systemPrompt = getSystemPromptWithContext(
            projectContext ?? undefined,
            customPrompt
        );

        const state: ReplState = {
            provider,
            providerType: options.provider ?? 'gemini',
            messages: [],
            systemPrompt,
            streaming: options.streaming !== false,
            contextManager: new ContextManager(),
        };

        // Raw Mode Implementation with Keypress Events
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.resume();

        let lineBuffer = '';
        let isInMenu = false;

        const redrawLine = () => {
            // Move cursor to start of line, clear line, then print prompt and buffer
            process.stdout.write('\r\x1b[K');
            process.stdout.write(getUserPrompt() + lineBuffer);
        };

        // Initial prompt
        redrawLine();

        process.stdin.on('keypress', async (str: string, key: any) => {
            if (isInMenu) return;

            // Ctrl+C
            if (key.ctrl && key.name === 'c') {
                process.stdout.write('\r\n');
                process.exit(0);
            }

            // Enter
            if (key.name === 'return') {
                process.stdout.write('\r\n');
                const input = lineBuffer.trim();
                lineBuffer = '';

                if (!input) {
                    redrawLine();
                    return;
                }

                // Handle Command directly if typed manually
                if (input.startsWith('/')) {
                    await handleCommand(input, state);
                    redrawLine();
                    return;
                }

                await handleMessage(input, state);
                redrawLine();
                return;
            }

            // Backspace
            if (key.name === 'backspace') {
                if (lineBuffer.length > 0) {
                    lineBuffer = lineBuffer.slice(0, -1);
                    redrawLine();
                }
                return;
            }

            // Slash Command Trigger
            if (str === '/' && lineBuffer === '') {
                isInMenu = true;
                process.stdout.write('/'); // Echo temporarily

                // Clear line for menu
                process.stdout.write('\r\x1b[K');

                const choices = COMMANDS.map(cmd => ({
                    name: `${cmd.name.padEnd(20)} ${chalk.gray(cmd.description)}`,
                    value: cmd.name,
                    short: cmd.name
                }));

                try {
                    process.stdin.setRawMode(false);
                    const answer = await inquirer.prompt([{
                        type: 'list',
                        name: 'command',
                        message: '명령어를 선택하세요:',
                        choices,
                        pageSize: 15,
                        loop: false,
                    }]);

                    if (answer.command) {
                        await handleCommand(answer.command, state);
                    }
                } catch (error) {
                    // Ignore
                } finally {
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                    isInMenu = false;
                    lineBuffer = '';
                    redrawLine();
                }
                return;
            }

            // @ File Mention Trigger
            if (str === '@') {
                isInMenu = true;
                const tempBuffer = lineBuffer;

                // Clear line for menu
                process.stdout.write('\r\x1b[K');

                try {
                    process.stdin.setRawMode(false);
                    const cwd = process.cwd();
                    const files = fs.readdirSync(cwd)
                        .filter(f => !f.startsWith('.') && f !== 'node_modules');

                    if (files.length > 0) {
                        const choices = files.map(f => ({
                            name: f,
                            value: f
                        }));

                        const answer = await inquirer.prompt([{
                            type: 'list',
                            name: 'file',
                            message: '파일을 선택하세요:',
                            choices,
                            pageSize: 15,
                            loop: false,
                        }]);

                        if (answer.file) {
                            lineBuffer = tempBuffer + '@' + answer.file + ' ';
                        } else {
                            lineBuffer = tempBuffer + '@';
                        }
                    } else {
                        lineBuffer = tempBuffer + '@';
                    }
                } catch (error) {
                    lineBuffer = tempBuffer + '@';
                } finally {
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                    isInMenu = false;
                    redrawLine();
                }
                return;
            }

            // Normal Character (Allow all printable characters)
            if (str) {
                lineBuffer += str;
                redrawLine();
            }
        });

    } catch (error) {
        spinner.fail('초기화 실패');
        console.error(chalk.red('오류:'), error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function handleCommand(input: string, state: ReplState): Promise<void> {
    const parts = input.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            // Simple help
            console.log(chalk.yellow('\n사용 가능한 명령어:'));
            COMMANDS.forEach(c => console.log(`  ${chalk.bold(c.name.padEnd(15))} ${c.description}`));
            console.log();
            break;
        case 'exit':
        case 'quit':
            process.exit(0);
            break;
        case 'clear':
            console.clear();
            state.messages = [];
            state.contextManager.clearAll();
            showSuccess(ko.session.cleared);
            break;
        case 'files':
        case 'context':
            // Show context (simplified)
            console.log(chalk.blue(`\n현재 컨텍스트: ${state.contextManager.getFileCount()}개 파일`));
            break;
        case 'save':
            await handleSave(state as any, args);
            break;
        case 'load':
            await handleLoad(state as any, args);
            break;
        case 'sessions':
            await handleListSessions();
            break;
        case 'about':
            showInfo('FeelFreeAI CLI v0.4.5 - AI 기반 코딩 어시스턴트');
            showInfo('GitHub: https://github.com/dhsgud/feelfreeai-cli');
            break;
        case 'bug':
            showInfo('버그 리포트: https://github.com/dhsgud/feelfreeai-cli/issues');
            break;
        case 'chat':
        case 'compress':
        case 'copy':
        case 'docs':
        case 'agent':
            showInfo('이 기능은 아직 개발 중입니다.');
            break;
        default:
            console.log(chalk.red(`\n알 수 없는 명령어: /${command}`));
    }
}

async function handleMessage(input: string, state: ReplState): Promise<void> {
    showAssistantHeader();

    if (state.streaming) {
        let isFirst = true;
        await state.provider.stream(
            [...state.messages, { role: 'user', content: input }],
            state.systemPrompt,
            (chunk) => {
                if (isFirst && !chunk.done) {
                    isFirst = false;
                }
                if (!chunk.done) {
                    process.stdout.write(chunk.text);
                } else {
                    console.log('\n');
                }
            }
        );
        // Add to history (simplified, ideally we capture full response)
        state.messages.push({ role: 'user', content: input });
        state.messages.push({ role: 'assistant', content: '(Streaming response)' });
    } else {
        const spinner = ora('응답 생성 중...').start();
        const response = await state.provider.chat(
            [...state.messages, { role: 'user', content: input }],
            state.systemPrompt
        );
        spinner.stop();
        console.log(response.text + '\n');
        state.messages.push({ role: 'user', content: input });
        state.messages.push({ role: 'assistant', content: response.text });
    }
}

function showInfo(msg: string) {
    console.log(chalk.blue(`ℹ ${msg}`));
}
