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
        content: string | Array<any>;
    }>;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    stream?: boolean;
    model?: string;
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

            console.log('[LlamaCpp] Request:', JSON.stringify(request, null, 2));

            const response = await this.client.post<LlamaCppResponse>(
                '/v1/chat/completions',
                request
            );

            const data = response.data;
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
        onChunk: (chunk: StreamChunk) => void,
        signal?: AbortSignal
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

            console.log('[LlamaCpp] Stream request:', JSON.stringify(request, null, 2));

            const response = await this.client.post('/v1/chat/completions', request, {
                responseType: 'stream',
                signal: signal,
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

                                if (parsed.choices?.[0]?.delta?.content) {
                                    content = parsed.choices[0].delta.content;
                                } else if (parsed.content) {
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
     * 메시지 포맷팅 (OpenAI 표준 멀티모달 포맷)
     */
    private formatMessages(
        messages: Message[],
        systemPrompt?: string
    ): Array<{ role: string; content: string | Array<any> }> {
        const formatted: Array<{ role: string; content: string | Array<any> }> = [];

        if (systemPrompt) {
            formatted.push({
                role: 'system',
                content: systemPrompt,
            });
        }

        // 컨텍스트 윈도우 관리를 위해 가장 최근 이미지 1개만 유지하고 나머지는 텍스트로 대체
        let lastImageIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (Array.isArray(msg.content)) {
                const hasImage = msg.content.some(c => c.type === 'image');
                if (hasImage) {
                    lastImageIndex = i;
                    break;
                }
            }
        }

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            let content: string | Array<any>;

            if (typeof msg.content === 'string') {
                content = msg.content || 'Hello';
            } else if (Array.isArray(msg.content) && msg.content.length > 0) {
                // 멀티모달 콘텐츠 처리 (텍스트를 먼저, 이미지를 나중에 배치)
                const textParts: any[] = [];
                const imageParts: any[] = [];

                msg.content.forEach(c => {
                    if (c.type === 'text') {
                        textParts.push({ type: 'text', text: c.text });
                    } else if (c.type === 'image') {
                        if (i === lastImageIndex) {
                            // 최신 이미지만 base64 데이터 포함
                            imageParts.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${c.image.mimeType};base64,${c.image.data}`
                                }
                            });
                        } else {
                            // 이전 이미지는 텍스트 플레이스홀더로 대체
                            textParts.push({ type: 'text', text: '[Image]' });
                        }
                    }
                });

                // 텍스트를 먼저 배치하고 이미지를 나중에 배치
                content = [...textParts, ...imageParts];

                // 빈 배열 방지 - Ministral-3 템플릿 에러 방지
                if (content.length === 0) {
                    content = 'Hello';
                }
            } else {
                // content가 비어있거나 null인 경우 - Ministral-3 템플릿 에러 방지
                content = 'Hello';
            }

            formatted.push({
                role: msg.role,
                content: content,
            });
        }

        return formatted;
    }
}
