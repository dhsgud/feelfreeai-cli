import { Message } from '../config/types';

/**
 * 메시지 최적화 옵션
 */
export interface OptimizationOptions {
    /** 최대 메시지 수 (기본값: 20) */
    maxMessages?: number;
    /** 최대 문자 수 (기본값: 30000) */
    maxChars?: number;
}

/**
 * 메시지 목록을 최적화하여 컨텍스트 윈도우 제한을 준수합니다.
 * - 가장 최근 메시지를 우선 유지합니다.
 * - 시스템 메시지는 항상 유지하려고 노력합니다 (구현에 따라 다름, 여기서는 단순히 최근 메시지 위주).
 * - 도구 호출과 결과 쌍이 깨지지 않도록 주의해야 하지만, 
 *   간단한 구현을 위해 메시지 단위로 자릅니다.
 *   (엄격한 정합성이 필요하면 로직을 더 정교하게 만들어야 함)
 */
export function optimizeMessages(
    messages: Message[],
    options: OptimizationOptions = {}
): Message[] {
    const maxMessages = options.maxMessages ?? 20;
    const maxChars = options.maxChars ?? 30000;

    if (messages.length === 0) {
        return [];
    }

    // 1. 메시지 개수 제한
    // 가장 최근 maxMessages 개만 선택
    let optimized = messages.slice(-maxMessages);

    // 2. 문자 수 제한
    // 뒤에서부터 계산하여 maxChars를 넘지 않도록 함
    let currentChars = 0;
    const finalMessages: Message[] = [];

    for (let i = optimized.length - 1; i >= 0; i--) {
        const msg = optimized[i];
        const msgLen = msg.content.length + (JSON.stringify(msg.toolCalls || '').length);

        if (currentChars + msgLen > maxChars) {
            // 용량 초과 시 여기서 중단 (더 오래된 메시지는 버림)
            break;
        }

        currentChars += msgLen;
        finalMessages.unshift(msg);
    }

    return finalMessages;
}
