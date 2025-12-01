import { getSystemPrompt, getSystemPromptWithContext, koreanSystemPrompt } from '../../../src/config/prompts/korean';

describe('Korean Prompts', () => {
    describe('koreanSystemPrompt', () => {
        it('should be a non-empty string', () => {
            expect(typeof koreanSystemPrompt).toBe('string');
            expect(koreanSystemPrompt.length).toBeGreaterThan(0);
        });

        it('should include Korean language instruction', () => {
            expect(koreanSystemPrompt).toContain('Korean');
            expect(koreanSystemPrompt).toContain('한국어');
        });

        it('should include thinking in English instruction', () => {
            expect(koreanSystemPrompt.toLowerCase()).toContain('english');
        });
    });

    describe('getSystemPrompt', () => {
        it('should return base prompt without custom prompt', () => {
            const prompt = getSystemPrompt();

            expect(prompt).toBe(koreanSystemPrompt);
        });

        it('should include custom prompt when provided', () => {
            const customPrompt = 'You are a senior developer';
            const prompt = getSystemPrompt(customPrompt);

            expect(prompt).toContain(koreanSystemPrompt);
            expect(prompt).toContain(customPrompt);
        });

        it('should handle empty string', () => {
            const prompt = getSystemPrompt('');

            expect(prompt).toBeDefined();
        });
    });

    describe('getSystemPromptWithContext', () => {
        it('should return base prompt without context', () => {
            const prompt = getSystemPromptWithContext();

            expect(prompt).toContain(koreanSystemPrompt);
        });

        it('should include project context when provided', () => {
            const projectContext = 'This is a TypeScript project for AI CLI';
            const prompt = getSystemPromptWithContext(projectContext);

            expect(prompt).toContain(projectContext);
            expect(prompt).toContain(koreanSystemPrompt);
        });

        it('should include custom prompt when provided', () => {
            const customPrompt = 'Be concise';
            const prompt = getSystemPromptWithContext(undefined, customPrompt);

            expect(prompt).toContain(customPrompt);
            expect(prompt).toContain(koreanSystemPrompt);
        });

        it('should include both project and custom prompts', () => {
            const projectContext = 'TypeScript CLI project';
            const customPrompt = 'Be concise';
            const prompt = getSystemPromptWithContext(projectContext, customPrompt);

            expect(prompt).toContain(projectContext);
            expect(prompt).toContain(customPrompt);
            expect(prompt).toContain(koreanSystemPrompt);
        });

        it('should handle undefined context gracefully', () => {
            const prompt = getSystemPromptWithContext(undefined);

            expect(prompt).toBeDefined();
            expect(prompt).not.toContain('undefined');
        });

        it('should handle empty strings', () => {
            const prompt = getSystemPromptWithContext('', '');

            expect(prompt).toBeDefined();
            expect(typeof prompt).toBe('string');
        });
    });

    describe('Prompt Structure', () => {
        it('should have clear instructions', () => {
            const prompt = koreanSystemPrompt;

            expect(prompt.split('\n').length).toBeGreaterThan(1);
        });

        it('should maintain consistent format with context', () => {
            const context = 'Test context';
            const prompt1 = getSystemPromptWithContext();
            const prompt2 = getSystemPromptWithContext(context);

            expect(prompt2).toContain(prompt1);
        });
    });
});
