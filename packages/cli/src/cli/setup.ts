import inquirer from 'inquirer';
import chalk from 'chalk';
import { ko } from '../config/locales/ko';
import { loadConfig, saveConfig, setApiKey, setEndpoint, setDefaultProvider } from '../config/manager';
import { ProviderType } from '../config/types';

/**
 * 설정 마법사
 */
export async function setupConfig(): Promise<void> {
    console.log(chalk.bold.blue('\n⚙️  FeelFree AI 설정\n'));

    // 프로바이더 선택
    const { provider } = await inquirer.prompt<{ provider: ProviderType }>([
        {
            type: 'list',
            name: 'provider',
            message: ko.config.selectProvider,
            choices: [
                { name: '🌐 Gemini (Google AI - 클라우드)', value: 'gemini' },
                { name: '🖥️  llama.cpp (로컬 서버)', value: 'llamacpp' },
            ],
        },
    ]);

    // 프로바이더별 설정
    if (provider === 'gemini') {
        await setupGemini();
    } else if (provider === 'llamacpp') {
        await setupLlamaCpp();
    }

    // 기본 프로바이더 설정
    await setDefaultProvider(provider);

    console.log(chalk.green(`\n✅ ${ko.providers[provider]} 프로바이더가 설정되었습니다.`));
}

/**
 * Gemini 설정
 */
async function setupGemini(): Promise<void> {
    console.log(chalk.gray('\nGemini API 키는 https://makersuite.google.com/app/apikey 에서 발급받을 수 있습니다.\n'));

    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: ko.config.enterApiKey,
            validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                    return 'API 키를 입력해주세요.';
                }
                return true;
            },
        },
    ]);

    await setApiKey('gemini', apiKey.trim());

    // 모델 선택
    const { model } = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: '사용할 모델을 선택하세요:',
            choices: [
                { name: 'gemini-1.5-flash (빠르고 효율적)', value: 'gemini-1.5-flash' },
                { name: 'gemini-1.5-pro (강력한 성능)', value: 'gemini-1.5-pro' },
                { name: 'gemini-pro (레거시)', value: 'gemini-pro' },
            ],
            default: 'gemini-1.5-flash',
        },
    ]);

    // 설정 저장
    const config = await loadConfig();
    config.providers.gemini.model = model;
    await saveConfig(config);
}

/**
 * llama.cpp 설정
 */
async function setupLlamaCpp(): Promise<void> {
    console.log(
        chalk.gray(
            '\nllama.cpp 서버가 실행 중이어야 합니다.\n' +
            '기본 엔드포인트: http://localhost:8080\n'
        )
    );

    const { endpoint } = await inquirer.prompt([
        {
            type: 'input',
            name: 'endpoint',
            message: ko.config.enterEndpoint,
            default: 'http://localhost:8080',
            validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                    return '엔드포인트를 입력해주세요.';
                }
                if (!input.startsWith('http://') && !input.startsWith('https://')) {
                    return 'http:// 또는 https://로 시작하는 URL을 입력해주세요.';
                }
                return true;
            },
        },
    ]);

    await setEndpoint('llamacpp', endpoint.trim());
}
