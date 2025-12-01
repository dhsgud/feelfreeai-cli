import { Message } from '../config/types';

/**
 * 스트리밍 청크
 */
export interface StreamChunk {
    /** 청크 텍스트 */
    text: string;
    /** 완료 여부 */
    done: boolean;
}

/**
 * 채팅 응답
 */
export interface ChatResponse {
    /** 응답 텍스트 */
    text: string;
    /** 사용된 토큰 수 (있는 경우) */
    tokensUsed?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

/**
 * 프로바이더 기본 인터페이스
 */
export abstract class BaseProvider {
    /**
     * 프로바이더 이름
     */
    abstract readonly name: string;

    /**
     * 채팅 완료 (비스트리밍)
     * @param messages 메시지 목록
     * @param systemPrompt 시스템 프롬프트
     * @returns 채팅 응답
     */
    abstract chat(messages: Message[], systemPrompt?: string): Promise<ChatResponse>;

    /**
     * 채팅 스트리밍
     * @param messages 메시지 목록
     * @param systemPrompt 시스템 프롬프트
     * @param onChunk 청크 콜백
     * @returns 최종 응답
     */
    abstract stream(
        messages: Message[],
        systemPrompt: string | undefined,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<ChatResponse>;

    /**
     * 토큰 수 계산
     * @param text 텍스트
     * @returns 토큰 수
     */
    abstract countTokens(text: string): Promise<number>;

    /**
     * 연결 상태 확인
     * @returns 연결 가능 여부
     */
    abstract checkHealth(): Promise<boolean>;

    /**
     * 메시지를 텍스트로 변환 (로깅용)
     */
    protected messagesToText(messages: Message[]): string {
        return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    }

    /**
     * 에러 처리
     */
    protected handleError(error: unknown, context: string): never {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[${this.name}] ${context}: ${message}`);
    }
}
