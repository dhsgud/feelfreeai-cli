import { BaseProvider } from './base';
import { LlamaCppProvider, LlamaCppOptions } from './llamacpp';
import { GeminiProvider, GeminiOptions } from './gemini';
import { ProviderType, GlobalConfig } from '../config/types';
import { loadConfig, getApiKeyFromEnv } from '../config/manager';

/**
 * 프로바이더 생성 에러
 */
export class ProviderCreationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProviderCreationError';
    }
}

/**
 * 프로바이더 팩토리
 */
export class ProviderFactory {
    /**
     * 설정에서 프로바이더 생성
     */
    static async createFromConfig(
        providerType?: ProviderType,
        config?: GlobalConfig
    ): Promise<BaseProvider> {
        // 설정 로드
        const globalConfig = config ?? (await loadConfig());
        const type = providerType ?? globalConfig.defaultProvider;

        return this.create(type, globalConfig);
    }

    /**
     * 프로바이더 생성
     */
    static create(type: ProviderType, config: GlobalConfig): BaseProvider {
        switch (type) {
            case 'llamacpp':
                return this.createLlamaCpp(config);
            case 'gemini':
                return this.createGemini(config);
            default:
                throw new ProviderCreationError(`알 수 없는 프로바이더 타입: ${type}`);
        }
    }

    /**
     * llama.cpp 프로바이더 생성
     */
    private static createLlamaCpp(config: GlobalConfig): LlamaCppProvider {
        const providerConfig = config.providers.llamacpp;

        if (!providerConfig.endpoint) {
            throw new ProviderCreationError(
                'llama.cpp 서버 엔드포인트가 설정되지 않았습니다. ' +
                '기본값: http://localhost:8080'
            );
        }

        const options: LlamaCppOptions = {
            endpoint: providerConfig.endpoint,
            temperature: providerConfig.temperature,
            topP: providerConfig.topP,
            topK: providerConfig.topK,
            maxTokens: providerConfig.maxTokens,
        };

        return new LlamaCppProvider(options);
    }

    /**
     * Gemini 프로바이더 생성
     */
    private static createGemini(config: GlobalConfig): GeminiProvider {
        const providerConfig = config.providers.gemini;

        // API 키 가져오기 (설정 파일 또는 환경 변수)
        const apiKey = providerConfig.apiKey ?? getApiKeyFromEnv('gemini');

        if (!apiKey) {
            throw new ProviderCreationError(
                'Gemini API 키가 설정되지 않았습니다. ' +
                '"feelfree login" 명령어를 실행하거나 ' +
                'GEMINI_API_KEY 환경 변수를 설정하세요.'
            );
        }

        const options: GeminiOptions = {
            apiKey,
            model: providerConfig.model,
            temperature: providerConfig.temperature,
            topP: providerConfig.topP,
            topK: providerConfig.topK,
            maxTokens: providerConfig.maxTokens,
        };

        return new GeminiProvider(options);
    }

    /**
     * 프로바이더 상태 확인
     */
    static async checkProvider(provider: BaseProvider): Promise<boolean> {
        try {
            return await provider.checkHealth();
        } catch (error) {
            console.error(`프로바이더 상태 확인 실패:`, error);
            return false;
        }
    }

    /**
     * 사용 가능한 프로바이더 목록
     */
    static getAvailableProviders(): ProviderType[] {
        return ['llamacpp', 'gemini'];
    }
}
