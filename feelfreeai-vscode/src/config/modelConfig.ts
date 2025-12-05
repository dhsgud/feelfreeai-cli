/**
 * 모델 설정 중앙 관리
 * ===========================
 * 모든 모델 관련 설정을 이 파일에서 관리합니다.
 * 설정을 변경하려면 이 파일만 수정하세요.
 */

export const MODEL_CONFIG = {
    // =========================================
    // LlamaCpp 설정
    // =========================================
    llamacpp: {
        /** 서버 엔드포인트 */
        endpoint: 'http://localhost:8080',
        /** 샘플링 온도 (0.0 - 1.0, 높을수록 창의적) */
        temperature: 0.1,
        /** 최대 출력 토큰 수 */
        maxTokens: 2048,
        /** Top-p 샘플링 (nucleus sampling) */
        topP: 0.95,
        /** Top-k 샘플링 */
        topK: 40,
    },

    // =========================================
    // Gemini 설정
    // =========================================
    gemini: {
        /** 기본 모델 */
        model: 'gemini-2.5-flash',
        /** 샘플링 온도 (0.0 - 1.0, 높을수록 창의적) */
        temperature: 0.3,
        /** 최대 출력 토큰 수 */
        maxTokens: 2048,
        /** Top-p 샘플링 (nucleus sampling) */
        topP: 0.95,
        /** Top-k 샘플링 */
        topK: 40,
    },

    // =========================================
    // 컨텍스트 윈도우 설정
    // =========================================
    context: {
        /** Gemini 1.5 Pro/Flash: 1M tokens */
        gemini: 1000000,
        /** LlamaCpp: 모델에 따라 다름 (기본값) */
        llamacpp: 18192,
    },
} as const;

// 타입 추출
export type LlamaCppConfig = typeof MODEL_CONFIG.llamacpp;
export type GeminiConfig = typeof MODEL_CONFIG.gemini;
export type ContextConfig = typeof MODEL_CONFIG.context;
