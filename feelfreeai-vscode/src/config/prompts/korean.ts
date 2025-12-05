/**
 * 한국어 응답을 위한 시스템 프롬프트
 * 
 * ⚠️ 프롬프트를 수정하려면 prompts.ts 파일을 수정하세요!
 * 이 파일은 호환성을 위해 prompts.ts에서 재내보내기만 합니다.
 */

import { PROMPTS, koreanSystemPrompt as _koreanSystemPrompt } from '../prompts';

// prompts.ts에서 가져온 한국어 시스템 프롬프트 재내보내기
export const koreanSystemPrompt = _koreanSystemPrompt;

/**
 * 기본 시스템 프롬프트 (한국어 포함)
 */
export const getSystemPrompt = (customPrompt?: string): string => {
    if (customPrompt) {
        return `${koreanSystemPrompt}\n\nAdditional instructions:\n${customPrompt}`;
    }
    return koreanSystemPrompt;
};

/**
 * 프로젝트 컨텍스트를 포함한 시스템 프롬프트
 */
export const getSystemPromptWithContext = (
    projectContext?: string,
    customPrompt?: string
): string => {
    let prompt = koreanSystemPrompt;

    if (projectContext) {
        prompt += `\n\nProject Context:\n${projectContext}`;
    }

    if (customPrompt) {
        prompt += `\n\nAdditional instructions:\n${customPrompt}`;
    }

    return prompt;
};

