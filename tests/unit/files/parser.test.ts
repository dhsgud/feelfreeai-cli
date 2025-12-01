import { preprocessInput } from '../../../src/files/parser';

describe('Input Parser', () => {
    describe('File References (@filename)', () => {
        it('should parse single file reference', () => {
            const input = '@README.md what is this project?';
            const result = preprocessInput(input);

            expect(result.type).toBe('file-reference');
            expect(result.files).toEqual(['README.md']);
            expect(result.processed).toBe('what is this project?');
        });

        it('should parse multiple file references', () => {
            const input = '@file1.ts @file2.js @package.json analyze these files';
            const result = preprocessInput(input);

            expect(result.type).toBe('file-reference');
            expect(result.files).toEqual(['file1.ts', 'file2.js', 'package.json']);
            expect(result.processed).toBe('analyze these files');
        });

        it('should handle file paths with directories', () => {
            const input = '@src/main.ts @lib/utils.js review this code';
            const result = preprocessInput(input);

            expect(result.files).toEqual(['src/main.ts', 'lib/utils.js']);
            expect(result.processed).toBe('review this code');
        });

        it('should handle files with spaces in path (quoted)', () => {
            const input = '@"my file.txt" read this';
            const result = preprocessInput(input);

            expect(result.files).toEqual(['my file.txt']);
        });

        it('should preserve original if no files', () => {
            const input = 'just a normal question';
            const result = preprocessInput(input);

            expect(result.type).toBe('text');
            expect(result.files).toBeUndefined();
            expect(result.processed).toBe('just a normal question');
        });
    });

    describe('Command Execution (!command)', () => {
        it('should parse simple command', () => {
            const input = '!ls -la';
            const result = preprocessInput(input);

            expect(result.type).toBe('command');
            expect(result.command).toBe('ls -la');
        });

        it('should parse command with arguments', () => {
            const input = '!npm test -- --coverage';
            const result = preprocessInput(input);

            expect(result.type).toBe('command');
            expect(result.command).toBe('npm test -- --coverage');
        });

        it('should parse Windows commands', () => {
            const input = '!Get-Process | Where-Object {$_.CPU -gt 100}';
            const result = preprocessInput(input);

            expect(result.type).toBe('command');
            expect(result.command).toBe('Get-Process | Where-Object {$_.CPU -gt 100}');
        });
    });

    describe('Mixed Input', () => {
        it('should handle file reference with question', () => {
            const input = '@config.json what are the settings?';
            const result = preprocessInput(input);

            expect(result.type).toBe('file-reference');
            expect(result.files).toEqual(['config.json']);
            expect(result.processed).toBe('what are the settings?');
        });

        it('should prioritize command over file reference', () => {
            const input = '!ls @ignored';
            const result = preprocessInput(input);

            expect(result.type).toBe('command');
            expect(result.command).toBe('ls @ignored');
        });

        it('should handle empty input', () => {
            const input = '';
            const result = preprocessInput(input);

            expect(result.type).toBe('text');
            expect(result.processed).toBe('');
        });

        it('should handle whitespace only', () => {
            const input = '   ';
            const result = preprocessInput(input);

            expect(result.type).toBe('text');
        });
    });

    describe('Edge Cases', () => {
        it('should handle @ in middle of text', () => {
            const input = 'email me at user@example.com';
            const result = preprocessInput(input);

            expect(result.type).toBe('text');
            expect(result.files).toBeUndefined();
        });

        it('should handle ! in middle of text', () => {
            const input = 'This is great! Really amazing!';
            const result = preprocessInput(input);

            expect(result.type).toBe('text');
            expect(result.command).toBeUndefined();
        });

        it('should handle special characters in filenames', () => {
            const input = '@my-file_v2.0.ts check this';
            const result = preprocessInput(input);

            expect(result.files).toEqual(['my-file_v2.0.ts']);
        });
    });
});
