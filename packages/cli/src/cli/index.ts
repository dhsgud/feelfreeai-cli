#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ProviderType, initProject } from '@feelfreeai/core';
import { ko } from '../config/locales/ko';
import { startRepl } from './repl';
import { setupConfig } from './setup';

const program = new Command();

program
    .name('feelfree')
    .description('FeelFree AI - AI 기반 코딩 어시스턴트')
    .version('0.2.0');

/**
 * 메인 명령어: 대화형 모드 또는 단일 쿼리
 */
program
    .argument('[query]', '실행할 쿼리 (선택사항)')
    .option('-c, --continue', '이전 대화 이어가기')
    .option('--provider <type>', '프로바이더 선택 (llamacpp 또는 gemini)')
    .option('--model <name>', '모델 이름')
    .option('--temperature <number>', '샘플링 온도 (0.0-1.0)', parseFloat)
    .option('--max-tokens <number>', '최대 토큰 수', parseInt)
    .option('--system-prompt <text>', '커스텀 시스템 프롬프트')
    .option('--system-prompt-file <path>', '시스템 프롬프트 파일 경로')
    .option('--append-system-prompt <text>', '기본 프롬프트에 추가할 내용')
    .option('--no-stream', '스트리밍 비활성화')
    .option('--output-format <format>', '출력 형식 (text 또는 json)', 'text')
    .action(async (query, options) => {
        try {
            const provider = options.provider as ProviderType | undefined;

            if (query) {
                // 단일 쿼리 모드
                const { executeQuery } = await import('./query');
                await executeQuery(query, {
                    provider,
                    continueSession: options.continue,
                    streaming: options.stream,
                    systemPrompt: options.systemPrompt,
                    systemPromptFile: options.systemPromptFile,
                    appendSystemPrompt: options.appendSystemPrompt,
                    outputFormat: options.outputFormat,
                });
            } else {
                // 대화형 모드
                await startRepl({
                    provider,
                    continueSession: options.continue,
                    streaming: options.stream,
                    systemPrompt: options.systemPrompt,
                    systemPromptFile: options.systemPromptFile,
                    appendSystemPrompt: options.appendSystemPrompt,
                });
            }
        } catch (error) {
            console.error(chalk.red('오류:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

/**
 * init 명령어: 프로젝트 초기화
 */
program
    .command('init')
    .description('프로젝트 초기화 (FEELFREE.md 생성)')
    .action(async () => {
        try {
            console.log(chalk.blue(ko.init.creating));
            await initProject();
            console.log(chalk.green(ko.init.created));
            console.log(chalk.gray('\nFEELFREE.md 파일을 수정하여 프로젝트 정보를 추가하세요.'));
        } catch (error) {
            if (error instanceof Error && error.message.includes('이미 존재')) {
                console.log(chalk.yellow(ko.init.alreadyExists));
            } else {
                console.error(chalk.red('오류:'), error instanceof Error ? error.message : error);
                process.exit(1);
            }
        }
    });

/**
 * login 명령어: API 키 및 설정
 */
program
    .command('login')
    .description('API 키 및 프로바이더 설정')
    .action(async () => {
        try {
            await setupConfig();
            console.log(chalk.green('\n✅ 설정이 완료되었습니다!'));
        } catch (error) {
            console.error(chalk.red('오류:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

/**
 * update 명령어: CLI 업데이트
 */
program
    .command('update')
    .description('CLI 도구 업데이트')
    .action(async () => {
        console.log(chalk.blue('업데이트 확인 중...'));
        console.log(
            chalk.yellow('아직 구현되지 않았습니다. npm update -g feelfreeai-cli를 실행하세요.')
        );
    });

/**
 * CLI 실행
 */
async function main() {
    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        console.error(chalk.red('예상치 못한 오류:'), error);
        process.exit(1);
    }
}

main();
