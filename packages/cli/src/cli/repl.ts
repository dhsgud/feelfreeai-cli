import fs from 'fs';
import chalk from 'chalk';

import ora from 'ora';
import readline from 'readline';
import {
    ContextManager,
    readProjectContext,
    ProviderType,
    Message,
    ProviderFactory,
    BaseProvider
} from '@feelfreeai/core';
import { getSystemPromptWithContext } from '../config/prompts/korean';
import { ko } from '../config/locales/ko';
import {
    handleSave,
    handleLoad,
    handleListSessions,
} from './repl-handlers';
import { preprocessInput, readFile } from '@feelfreeai/core';
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

interface AutocompleteState {
    active: boolean;
    mode: 'command' | 'file' | null;
    suggestions: { name: string; description?: string; value: string }[];
    selectedIndex: number;
    queryStartIndex: number; // Index in lineBuffer where the query starts
}

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

        // Autocomplete State
        const acState: AutocompleteState = {
            active: false,
            mode: null,
            suggestions: [],
            selectedIndex: 0,
            queryStartIndex: 0
        };

        const updateSuggestions = () => {
            if (!acState.active) return;

            const query = lineBuffer.slice(acState.queryStartIndex);

            if (acState.mode === 'command') {
                acState.suggestions = COMMANDS
                    .filter(cmd => cmd.name.startsWith(query) || cmd.name.includes(query))
                    .map(cmd => ({ name: cmd.name, description: cmd.description, value: cmd.name }));
            } else if (acState.mode === 'file') {
                try {
                    const cwd = process.cwd();
                    const files = fs.readdirSync(cwd)
                        .filter(f => !f.startsWith('.') && f !== 'node_modules');

                    acState.suggestions = files
                        .filter(f => f.toLowerCase().includes(query.toLowerCase()))
                        .map(f => ({ name: f, value: f }));
                } catch (e) {
                    acState.suggestions = [];
                }
            }

            // Reset selection if out of bounds
            if (acState.selectedIndex >= acState.suggestions.length) {
                acState.selectedIndex = 0;
            }
        };

        const redrawLine = () => {
            // 1. Clear current line
            process.stdout.write('\r\x1b[K');

            // 2. Print prompt and buffer
            process.stdout.write(getUserPrompt() + lineBuffer);

            // 3. Render suggestions if active
            if (acState.active && acState.suggestions.length > 0) {
                let output = '\n\x1b[J'; // Move down and clear below
                let lines = 1;

                const maxSuggestions = 5;
                const start = Math.max(0, Math.min(acState.selectedIndex - 2, acState.suggestions.length - maxSuggestions));
                const end = Math.min(start + maxSuggestions, acState.suggestions.length);

                for (let i = start; i < end; i++) {
                    const item = acState.suggestions[i];
                    const isSelected = i === acState.selectedIndex;
                    const prefix = isSelected ? chalk.cyan('> ') : '  ';
                    const text = isSelected ? chalk.cyan(item.name) : item.name;
                    const desc = item.description ? chalk.gray(` - ${item.description}`) : '';

                    output += `${prefix}${text}${desc}\n`;
                    lines++;
                }

                if (acState.suggestions.length > maxSuggestions) {
                    output += chalk.gray(`  ... (${acState.suggestions.length - end} more)\n`);
                    lines++;
                }

                process.stdout.write(output);

                // Restore cursor by moving up and reprinting prompt
                process.stdout.write(`\x1b[${lines}A`); // Move up
                process.stdout.write('\r'); // Move to start
                process.stdout.write(getUserPrompt() + lineBuffer); // Reprint prompt
            }
        };

        // Initial prompt
        redrawLine();

        process.stdin.on('keypress', async (str: string, key: any) => {
            // Ctrl+C
            if (key.ctrl && key.name === 'c') {
                process.stdout.write('\r\n');
                process.exit(0);
            }

            // Navigation in Menu
            if (acState.active && acState.suggestions.length > 0) {
                if (key.name === 'up') {
                    acState.selectedIndex = Math.max(0, acState.selectedIndex - 1);
                    redrawLine();
                    return;
                }
                if (key.name === 'down') {
                    acState.selectedIndex = Math.min(acState.suggestions.length - 1, acState.selectedIndex + 1);
                    redrawLine();
                    return;
                }
                if (key.name === 'tab' || key.name === 'return') {
                    const selected = acState.suggestions[acState.selectedIndex];
                    if (selected) {
                        // Apply selection
                        const beforeQuery = lineBuffer.slice(0, acState.queryStartIndex);

                        if (acState.mode === 'command') {
                            lineBuffer = selected.value + ' '; // Add space after command
                        } else {
                            lineBuffer = beforeQuery + selected.value + ' ';
                        }

                        // Reset state
                        acState.active = false;
                        acState.mode = null;
                        acState.suggestions = [];

                        // If it was Enter, we might want to execute immediately if it's a command
                        // But for now let's just complete the text and let user hit enter again or continue typing
                        // Actually user requested "Enter to select OR execute". 
                        // If it's a command completion, usually we just complete. 
                        // If user hits Enter again, it executes.

                        // Exception: If it was 'return' and we completed a command, 
                        // maybe we should execute it if it's a full command?
                        // Let's stick to completion first for safety.

                        redrawLine();
                        return;
                    }
                }
                if (key.name === 'escape') {
                    acState.active = false;
                    acState.mode = null;
                    acState.suggestions = [];
                    // Clear the query part? User said "Esc to clear input/suggestions"
                    // Usually Esc closes menu. If pressed again, clears line.
                    // Let's just close menu for now.

                    // Clear suggestions from screen
                    process.stdout.write('\x1b7\n\x1b[J\x1b8');
                    redrawLine();
                    return;
                }
            }

            // Enter (Execute)
            if (key.name === 'return') {
                process.stdout.write('\r\n');
                const input = lineBuffer.trim();
                lineBuffer = '';

                // Reset AC state
                acState.active = false;
                acState.suggestions = [];

                if (!input) {
                    redrawLine();
                    return;
                }

                // Handle Command
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

                    // Check if we deleted the trigger
                    if (acState.active) {
                        if (lineBuffer.length < acState.queryStartIndex) {
                            acState.active = false;
                        } else {
                            updateSuggestions();
                        }
                    }

                    redrawLine();
                }
                return;
            }

            // Normal Input
            if (str) {
                // Check for triggers
                if (str === '/' && lineBuffer === '') {
                    acState.active = true;
                    acState.mode = 'command';
                    acState.queryStartIndex = 0; // Start of line
                    acState.selectedIndex = 0;
                    lineBuffer += str;
                    updateSuggestions();
                    redrawLine();
                    return;
                }

                if (str === '@') {
                    acState.active = true;
                    acState.mode = 'file';
                    acState.queryStartIndex = lineBuffer.length + 1; // After @
                    acState.selectedIndex = 0;
                    lineBuffer += str;
                    updateSuggestions();
                    redrawLine();
                    return;
                }

                lineBuffer += str;

                if (acState.active) {
                    updateSuggestions();
                }

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
            showInfo('FeelFreeAI CLI v0.4.6 - AI 기반 코딩 어시스턴트');
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
    // 1. Preprocess input to find file references
    const processed = preprocessInput(input);
    let finalInput = processed.processed;

    // 2. Handle file references
    if (processed.type === 'file-reference' && processed.files) {
        console.log(chalk.gray(`\n파일 읽는 중: ${processed.files.join(', ')}...`));

        for (const filePath of processed.files) {
            try {
                const result = await readFile(filePath);
                if (result.exists) {
                    state.contextManager.addFile(result);
                    console.log(chalk.green(`✓ ${filePath} 로드됨`));
                } else {
                    console.log(chalk.red(`✗ ${filePath} (찾을 수 없음)`));
                }
            } catch (error) {
                console.log(chalk.red(`✗ ${filePath} (오류: ${error instanceof Error ? error.message : String(error)})`));
            }
        }
        console.log(); // Empty line
    }

    showAssistantHeader();

    // 3. Prepare System Prompt with Context
    const contextText = state.contextManager.getContextText();
    const systemPromptWithContext = contextText
        ? `${state.systemPrompt}\n\n${contextText}`
        : state.systemPrompt;

    if (state.streaming) {
        let isFirst = true;
        await state.provider.stream(
            [...state.messages, { role: 'user', content: finalInput }],
            systemPromptWithContext,
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
        // Add to history
        state.messages.push({ role: 'user', content: finalInput });
        state.messages.push({ role: 'assistant', content: '(Streaming response)' });
    } else {
        const spinner = ora('응답 생성 중...').start();
        const response = await state.provider.chat(
            [...state.messages, { role: 'user', content: finalInput }],
            systemPromptWithContext
        );
        spinner.stop();
        console.log(response.text + '\n');
        state.messages.push({ role: 'user', content: finalInput });
        state.messages.push({ role: 'assistant', content: response.text });
    }
}

function showInfo(msg: string) {
    console.log(chalk.blue(`ℹ ${msg}`));
}
