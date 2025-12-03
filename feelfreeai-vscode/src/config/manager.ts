import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { GlobalConfig, ProviderType } from './types';

/**
 * 기본 설정
 */
const DEFAULT_CONFIG: GlobalConfig = {
    defaultProvider: 'gemini',
    providers: {
        llamacpp: {
            type: 'llamacpp',
            endpoint: 'http://localhost:8080',
            model: 'default',
            temperature: 0.7,
            maxTokens: 2048,
        },
        gemini: {
            type: 'gemini',
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 2048,
        },
    },
    allowedTools: ['read'],
    language: 'ko',
    streaming: true,
};

/**
 * 설정 파일의 디렉토리 경로
 */
export const getConfigDir = (): string => {
    return path.join(os.homedir(), '.feelfreeai');
};

/**
 * 설정 파일 경로
 */
export const getConfigPath = (): string => {
    return path.join(getConfigDir(), 'settings.json');
};

/**
 * 설정 디렉토리 생성
 */
export const ensureConfigDir = async (): Promise<void> => {
    const configDir = getConfigDir();
    try {
        await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
        console.error('설정 디렉토리 생성 실패:', error);
        throw error;
    }
};

/**
 * 설정 로드
 */
export const loadConfig = async (): Promise<GlobalConfig> => {
    try {
        const configPath = getConfigPath();
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data) as GlobalConfig;

        // 기본값과 병합
        return {
            ...DEFAULT_CONFIG,
            ...config,
            providers: {
                llamacpp: { ...DEFAULT_CONFIG.providers.llamacpp, ...config.providers?.llamacpp },
                gemini: { ...DEFAULT_CONFIG.providers.gemini, ...config.providers?.gemini },
            },
        };
    } catch (error) {
        // 설정 파일이 없으면 기본 설정 반환
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return DEFAULT_CONFIG;
        }
        throw error;
    }
};

/**
 * 설정 저장
 */
export const saveConfig = async (config: GlobalConfig): Promise<void> => {
    await ensureConfigDir();
    const configPath = getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
};

/**
 * API 키 설정
 */
export const setApiKey = async (provider: ProviderType, apiKey: string): Promise<void> => {
    const config = await loadConfig();

    if (provider === 'gemini') {
        config.providers.gemini.apiKey = apiKey;
    }

    await saveConfig(config);
};

/**
 * 엔드포인트 설정
 */
export const setEndpoint = async (provider: ProviderType, endpoint: string): Promise<void> => {
    const config = await loadConfig();

    if (provider === 'llamacpp') {
        config.providers.llamacpp.endpoint = endpoint;
    }

    await saveConfig(config);
};

/**
 * 기본 프로바이더 설정
 */
export const setDefaultProvider = async (provider: ProviderType): Promise<void> => {
    const config = await loadConfig();
    config.defaultProvider = provider;
    await saveConfig(config);
};

/**
 * 환경 변수에서 API 키 가져오기
 */
export const getApiKeyFromEnv = (provider: ProviderType): string | undefined => {
    if (provider === 'gemini') {
        return process.env.GEMINI_API_KEY;
    }
    return undefined;
};
