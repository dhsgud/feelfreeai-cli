import chalk from 'chalk';
import ora from 'ora';
import { ProviderFactory } from '../providers/factory';
import { BaseProvider } from '../providers/base';
import { ProviderType } from '../config/types';
import { getSystemPromptWithContext } from '../config/prompts/korean';
import { readProjectContext } from '../config/project';
import fs from 'fs/promises';

/**
 * 쿼리 실행 옵션
 */
export interface QueryOptions {
    provider?: ProviderType;
    continueSession?: boolean;
    streaming?: boolean;
    systemPrompt?: string;
    systemPromptFile?: string;
    appendSystemPrompt?: string;
    outputFormat?: 'text' | 'json';
}

/**
 * 단일 쿼리 실행
 */
export async function executeQuery(query: string, options: QueryOptions): Promise<void> {
    const spinner = ora('프로바이더 초기화 중...').start();

    try {
        // 프로바이더 생성
        const provider = await ProviderFactory.createFromConfig(options.provider);
        spinner.succeed(`${provider.name} 프로바이더 준비 완료`);

        // 시스템 프롬프트 구성
        const systemPrompt = await buildSystemPrompt(options);

        // 쿼리 실행
        if (options.streaming !== false) {
            await executeStreamingQuery(provider, query, systemPrompt);
        } else {
            await executeNonStreamingQuery(provider, query, systemPrompt, options.outputFormat);
        }
    } catch (error) {
        spinner.fail('오류 발생');
        throw error;
    }
}

/**
 * 스트리밍 쿼리 실행
 */
async function executeStreamingQuery(
    provider: BaseProvider,
    query: string,
    systemPrompt: string
): Promise<void> {
    console.log(chalk.bold.blue('\n🤖 FeelFree AI:\n'));

    let isFirst = true;

    await provider.stream(
        [{ role: 'user', content: query }],
        systemPrompt,
        (chunk) => {
            if (isFirst && !chunk.done) {
                // 첫 번째 청크 - 커서 표시
                process.stdout.write(chalk.gray('응답 생성 중... '));
                isFirst = false;
            }

            if (!chunk.done) {
                process.stdout.write(chunk.text);
            } else {
                // 스트림 완료
                console.log('\n');
            }
        }
    );
}

/**
 * 비스트리밍 쿼리 실행
 */
async function executeNonStreamingQuery(
    provider: BaseProvider,
    query: string,
    systemPrompt: string,
    outputFormat?: 'text' | 'json'
): Promise<void> {
    const spinner = ora('응답 생성 중...').start();

    const response = await provider.chat([{ role: 'user', content: query }], systemPrompt);

    spinner.stop();

    if (outputFormat === 'json') {
        console.log(JSON.stringify({ response: response.text, tokens: response.tokensUsed }, null, 2));
    } else {
        console.log(chalk.bold.blue('\n🤖 FeelFree AI:\n'));
        console.log(response.text);
        console.log();

        if (response.tokensUsed) {
            console.log(
                chalk.gray(
                    `\n📊 토큰 사용량: ${response.tokensUsed.total} ` +
                    `(프롬프트: ${response.tokensUsed.prompt}, 완료: ${response.tokensUsed.completion})`
                )
            );
        }
    }
}

/**
 * 시스템 프롬프트 구성
 */
async function buildSystemPrompt(options: QueryOptions): Promise<string> {
    let customPrompt = options.systemPrompt;

    // 파일에서 시스템 프롬프트 로드
    if (options.systemPromptFile) {
        try {
            const fileContent = await fs.readFile(options.systemPromptFile, 'utf-8');
            customPrompt = fileContent;
        } catch (error) {
            console.warn(
                chalk.yellow(`경고: 시스템 프롬프트 파일을 읽을 수 없습니다: ${options.systemPromptFile}`)
            );
        }
    }

    // 추가 프롬프트
    if (options.appendSystemPrompt) {
        customPrompt = customPrompt
            ? `${customPrompt}\n\n${options.appendSystemPrompt}`
            : options.appendSystemPrompt;
    }

    // 프로젝트 컨텍스트 로드
    const projectContext = await readProjectContext();

    return getSystemPromptWithContext(projectContext ?? undefined, customPrompt);
}
