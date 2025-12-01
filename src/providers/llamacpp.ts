import axios, { AxiosInstance } from 'axios';
import { BaseProvider, ChatResponse, StreamChunk } from './base';
import { Message } from '../config/types';

/**
 * llama.cpp 서버 응답 형식
 */
interface LlamaCppResponse {
    content?: string;
    choices?: Array<{
        message?: { content: string };
        delta?: { content: string };
        finish_reason?: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    stop?: boolean;
    generation_settings?: {
        n_ctx: number;
        n_predict: number;
    };
    timings?: {
        prompt_n: number;
        predicted_n: number;
        total_n?: number;
    };
}

/**
 * llama.cpp 서버 채팅 요청
 */
interface LlamaCppChatRequest {
    messages: Array<{
        role: string;
        content: string;
    }>;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    stream?: boolean;
}

/**
 * llama.cpp 프로바이더 옵션
 */
export interface LlamaCppOptions {
    /** 서버 엔드포인트 */
    endpoint: string;
    /** 온도 */
    temperature?: number;
    /** Top-p */
    topP?: number;
    /** Top-k */
    topK?: number;
    /** 최대 토큰 */
    maxTokens?: number;
    /** 타임아웃 (ms) */
    timeout?: number;
}

/**
 * llama.cpp 프로바이더
 */
export class LlamaCppProvider extends BaseProvider {
    readonly name = 'llama.cpp';
    private client: AxiosInstance;
    private options: Required<LlamaCppOptions>;

    constructor(options: LlamaCppOptions) {
        super();

        this.options = {
            endpoint: options.endpoint,
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.9,
            topK: options.topK ?? 40,
            maxTokens: options.maxTokens ?? 2048,
            timeout: options.timeout ?? 60000,
        };

        this.client = axios.create({
            baseURL: this.options.endpoint,
            timeout: this.options.timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * 채팅 완료
     */
    async chat(messages: Message[], systemPrompt?: string): Promise<ChatResponse> {
        try {
            const formattedMessages = this.formatMessages(messages, systemPrompt);

            const request: LlamaCppChatRequest = {
                messages: formattedMessages,
                temperature: this.options.temperature,
                top_p: this.options.topP,
                top_k: this.options.topK,
                max_tokens: this.options.maxTokens,
                stream: false,
            };

            const response = await this.client.post<LlamaCppResponse>(
                '/v1/chat/completions',
                request
            );

            const data = response.data;

            // OpenAI 호환 포맷 지원
            const text = data.choices?.[0]?.message?.content || data.content || '';

            return {
                text,
                tokensUsed: data.usage
                    ? {
                        prompt: data.usage.prompt_tokens,
                        completion: data.usage.completion_tokens,
                        total: data.usage.total_tokens,
                    }
                    : data.timings
                        ? {
                            prompt: data.timings.prompt_n,
                            completion: data.timings.predicted_n,
                            total: data.timings.prompt_n + data.timings.predicted_n,
                        }
                        : undefined,
            };
        } catch (error) {
            this.handleError(error, '채팅 요청 실패');
        }
    }

    /**
     * 채팅 스트리밍
     */
    async stream(
        messages: Message[],
        systemPrompt: string | undefined,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<ChatResponse> {
        try {
            const formattedMessages = this.formatMessages(messages, systemPrompt);

            const request: LlamaCppChatRequest = {
                messages: formattedMessages,
                temperature: this.options.temperature,
                top_p: this.options.topP,
                top_k: this.options.topK,
                max_tokens: this.options.maxTokens,
                stream: true,
            };

            const response = await this.client.post('/v1/chat/completions', request, {
                responseType: 'stream',
            });

            let fullText = '';

            return new Promise((resolve, reject) => {
                response.data.on('data', (chunk: Buffer) => {
                    const lines = chunk.toString().split('\n').filter((line) => line.trim());

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();

                            if (data === '[DONE]') {
                                onChunk({ text: '', done: true });
                                resolve({ text: fullText });
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                let content = '';

                                // OpenAI 호환 포맷 지원
                                if (parsed.choices?.[0]?.delta?.content) {
                                    content = parsed.choices[0].delta.content;
                                } else if (parsed.content) {
                                    // 기존 llama.cpp 포맷 지원
                                    content = parsed.content;
                                }

                                if (content) {
                                    fullText += content;
                                    onChunk({ text: content, done: false });
                                }
                            } catch (e) {
                                // JSON 파싱 실패 무시
                            }
                        }
                    }
                });

                response.data.on('error', (error: Error) => {
                    reject(error);
                });

                response.data.on('end', () => {
                    resolve({ text: fullText });
                });
            });
        } catch (error) {
            this.handleError(error, '스트리밍 요청 실패');
        }
    }

    /**
     * 토큰 수 계산 (대략적)
     */
    async countTokens(text: string): Promise<number> {
        // llama.cpp는 토큰 카운팅 API가 없으므로 대략적으로 계산
        // 영어: 대략 1 토큰 = 4자
        // 한글: 대략 1 토큰 = 1-2자
        const approximateTokens = Math.ceil(text.length / 3);
        return approximateTokens;
    }

    /**
     * 서버 상태 확인
     */
    async checkHealth(): Promise<boolean> {
        try {
            await this.client.get('/health');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 메시지를 llama.cpp 형식으로 변환
     */
    private formatMessages(
        messages: Message[],
        systemPrompt?: string
    ): Array<{ role: string; content: string }> {
        const formatted: Array<{ role: string; content: string }> = [];

        // 시스템 프롬프트 추가
        if (systemPrompt) {
            formatted.push({
                role: 'system',
                content: systemPrompt,
            });
        }

        // 메시지 변환
        for (const msg of messages) {
            formatted.push({
                role: msg.role,
                content: msg.content,
            });
        }

        return formatted;
    }
}
