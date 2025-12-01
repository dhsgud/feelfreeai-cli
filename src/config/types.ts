/**
 * 프로바이더 타입: llama.cpp 또는 Gemini
 */
export type ProviderType = 'llamacpp' | 'gemini';

/**
 * 도구 권한 타입
 */
export type ToolPermission = 'read' | 'write' | 'bash' | 'mcp';

/**
 * LLM 프로바이더 설정
 */
export interface ProviderConfig {
    /** 프로바이더 타입 */
    type: ProviderType;
    /** API 키 (Gemini 전용) */
    apiKey?: string;
    /** 서버 URL (llama.cpp 전용) */
    endpoint?: string;
    /** 모델 이름 */
    model?: string;
    /** 온도 (0.0 - 1.0) */
    temperature?: number;
    /** Top-p 샘플링 */
    topP?: number;
    /** Top-k 샘플링 */
    topK?: number;
    /** 최대 토큰 수 */
    maxTokens?: number;
}

/**
 * 전역 설정
 */
export interface GlobalConfig {
    /** 기본 프로바이더 */
    defaultProvider: ProviderType;
    /** 프로바이더별 설정 */
    providers: {
        llamacpp: ProviderConfig;
        gemini: ProviderConfig;
    };
    /** 허용된 도구 권한 */
    allowedTools: ToolPermission[];
    /** 언어 설정 */
    language: 'ko' | 'en';
    /** 스트리밍 활성화 여부 */
    streaming: boolean;
}

/**
 * 프로젝트별 설정
 */
export interface ProjectConfig {
    /** 프로젝트 이름 */
    name?: string;
    /** 프로젝트 설명 */
    description?: string;
    /** 커스텀 시스템 프롬프트 */
    systemPrompt?: string;
    /** 허용된 도구 (프로젝트별 오버라이드) */
    allowedTools?: ToolPermission[];
    /** 커스텀 슬래시 명령어 경로 */
    customCommandsPath?: string;
}

/**
 * 메시지 역할
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 대화 메시지
 */
export interface Message {
    /** 메시지 역할 */
    role: MessageRole;
    /** 메시지 내용 */
    content: string;
    /** 타임스탬프 */
    timestamp?: Date;
    /** 도구 호출 정보 (있는 경우) */
    toolCalls?: ToolCall[];
}

/**
 * 도구 호출
 */
export interface ToolCall {
    /** 도구 이름 */
    name: string;
    /** 도구 인자 */
    arguments: Record<string, unknown>;
    /** 실행 결과 */
    result?: string;
}

/**
 * 대화 세션
 */
export interface Session {
    /** 세션 ID */
    id: string;
    /** 세션 이름 */
    name?: string;
    /** 메시지 목록 */
    messages: Message[];
    /** 생성 시각 */
    createdAt: Date;
    /** 마지막 수정 시각 */
    updatedAt: Date;
    /** 사용된 프로바이더 */
    provider: ProviderType;
}
