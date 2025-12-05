import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult, Part, Content } from '@google/generative-ai';
import { BaseProvider, ChatResponse, StreamChunk } from './base';
import { Message } from '../config/types';
import { MODEL_CONFIG } from '../config/modelConfig';

/**
 * Gemini 프로바이더 옵션
 */
export interface GeminiOptions {
    /** API 키 */
    apiKey: string;
    /** 모델 이름 */
    model?: string;
    /** 온도 */
    temperature?: number;
    /** Top-p */
    topP?: number;
    /** Top-k */
    topK?: number;
    /** 최대 토큰 */
    maxTokens?: number;
}

/**
 * Gemini 프로바이더
 */
export class GeminiProvider extends BaseProvider {
    readonly name = 'Gemini';
    private client: GoogleGenerativeAI;
    private model: GenerativeModel;
    private options: Required<GeminiOptions>;

    constructor(options: GeminiOptions) {
        super();

        if (!options.apiKey) {
            throw new Error('Gemini API 키가 필요합니다.');
        }

        this.options = {
            apiKey: options.apiKey,
            model: options.model ?? MODEL_CONFIG.gemini.model,
            temperature: options.temperature ?? MODEL_CONFIG.gemini.temperature,
            topP: options.topP ?? MODEL_CONFIG.gemini.topP,
            topK: options.topK ?? MODEL_CONFIG.gemini.topK,
            maxTokens: options.maxTokens ?? MODEL_CONFIG.gemini.maxTokens,
        };

        this.client = new GoogleGenerativeAI(this.options.apiKey);
        this.model = this.client.getGenerativeModel({
            model: this.options.model,
            generationConfig: {
                temperature: this.options.temperature,
                topP: this.options.topP,
                topK: this.options.topK,
                maxOutputTokens: this.options.maxTokens,
            },
        });
    }

    /**
     * 채팅 완료
     */
    async chat(messages: Message[], systemPrompt?: string): Promise<ChatResponse> {
        try {
            const contents = this.formatMessages(messages, systemPrompt);

            const result: GenerateContentResult = await this.model.generateContent({
                contents: contents,
            });

            const response = result.response;
            const text = response.text();

            // 토큰 사용량 계산
            const tokensUsed = response.usageMetadata
                ? {
                    prompt: response.usageMetadata.promptTokenCount || 0,
                    completion: response.usageMetadata.candidatesTokenCount || 0,
                    total: response.usageMetadata.totalTokenCount || 0,
                }
                : undefined;

            return {
                text,
                tokensUsed,
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
            const contents = this.formatMessages(messages, systemPrompt);

            const result = await this.model.generateContentStream({
                contents: contents,
            });

            let fullText = '';

            for await (const chunk of result.stream) {
                if (signal?.aborted) {
                    onChunk({ text: '', done: true });
                    break;
                }

                const chunkText = chunk.text();
                fullText += chunkText;

                onChunk({
                    text: chunkText,
                    done: false,
                });
            }

            // 스트림 완료 신호
            onChunk({ text: '', done: true });

            // 최종 응답 가져오기
            const finalResponse = await result.response;
            const tokensUsed = finalResponse.usageMetadata
                ? {
                    prompt: finalResponse.usageMetadata.promptTokenCount || 0,
                    completion: finalResponse.usageMetadata.candidatesTokenCount || 0,
                    total: finalResponse.usageMetadata.totalTokenCount || 0,
                }
                : undefined;

            return {
                text: fullText,
                tokensUsed,
            };
        } catch (error) {
            this.handleError(error, '스트리밍 요청 실패');
        }
    }

    /**
     * 토큰 수 계산
     */
    async countTokens(text: string): Promise<number> {
        try {
            const result = await this.model.countTokens(text);
            return result.totalTokens;
        } catch (error) {
            // 에러 발생 시 대략적으로 계산
            return Math.ceil(text.length / 3);
        }
    }

    /**
     * API 연결 확인
     */
    async checkHealth(): Promise<boolean> {
        try {
            // 간단한 메시지로 연결 테스트
            await this.model.countTokens('test');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 메시지를 Gemini 형식으로 변환
     */
    private formatMessages(
        messages: Message[],
        systemPrompt?: string
    ): Content[] {
        const contents: Content[] = [];

        // Gemini는 시스템 프롬프트를 첫 번째 유저 메시지에 포함
        let firstUserMessage = true;

        for (const msg of messages) {
            // 시스템 메시지는 건너뛰기 (이미 시스템 프롬프트에 포함됨)
            if (msg.role === 'system') {
                continue;
            }

            const parts: Part[] = [];

            if (typeof msg.content === 'string') {
                let textContent = msg.content;
                // 첫 번째 유저 메시지에 시스템 프롬프트 추가
                if (firstUserMessage && msg.role === 'user' && systemPrompt) {
                    textContent = `${systemPrompt}\n\n${textContent}`;
                    firstUserMessage = false;
                }
                parts.push({ text: textContent });
            } else {
                // 멀티모달 콘텐츠 처리
                for (const content of msg.content) {
                    if (content.type === 'text' && content.text) {
                        let text = content.text;
                        if (firstUserMessage && msg.role === 'user' && systemPrompt) {
                            text = `${systemPrompt}\n\n${text}`;
                            firstUserMessage = false;
                        }
                        parts.push({ text });
                    } else if (content.type === 'image' && content.image) {
                        parts.push({
                            inlineData: {
                                mimeType: content.image.mimeType,
                                data: content.image.data
                            }
                        });
                    }
                }
            }

            // Gemini는 'assistant' 대신 'model'을 사용
            const role = msg.role === 'assistant' ? 'model' : msg.role;

            contents.push({
                role: role,
                parts: parts,
            });
        }

        return contents;
    }

    protected handleError(error: unknown, context: string): never {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('429') || message.includes('Too Many Requests')) {
            throw new Error(`[Gemini] ${context}: 요청 한도를 초과했습니다. (429)\n` +
                `현재 모델(${this.options.model})의 사용량이 많습니다.\n` +
                `설정에서 다른 모델로 변경해보세요.`);
        }

        throw new Error(`[Gemini] ${context}: ${message}`);
    }
}
