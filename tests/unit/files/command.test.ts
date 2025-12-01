import {
    checkCommandSafety,
    formatCommandForContext,
    summarizeCommandResult,
    CommandResult,
} from '../../../src/files/command';

describe('Command Execution', () => {
    describe('checkCommandSafety', () => {
        describe('Dangerous Commands', () => {
            it('should block rm -rf /', () => {
                const result = checkCommandSafety('rm -rf /');

                expect(result.isDangerous).toBe(true);
                expect(result.needsWarning).toBe(true);
                expect(result.reason).toContain('심각한 손상');
            });

            it('should block fork bomb', () => {
                const result = checkCommandSafety(':(){ :|:& };:');

                expect(result.isDangerous).toBe(true);
            });

            it('should block disk write commands', () => {
                const result = checkCommandSafety('echo test > /dev/sda');

                expect(result.isDangerous).toBe(true);
            });

            it('should block mkfs commands', () => {
                const result = checkCommandSafety('mkfs.ext4 /dev/sdb');

                expect(result.isDangerous).toBe(true);
            });

            it('should block dd commands', () => {
                const result = checkCommandSafety('dd if=/dev/zero of=/dev/sda');

                expect(result.isDangerous).toBe(true);
            });

            it('should block Windows format commands', () => {
                const result = checkCommandSafety('format C:');

                expect(result.isDangerous).toBe(true);
            });
        });

        describe('Warning Commands', () => {
            it('should warn on rm -r', () => {
                const result = checkCommandSafety('rm -r folder');

                expect(result.isDangerous).toBe(false);
                expect(result.needsWarning).toBe(true);
                expect(result.reason).toContain('주의');
            });

            it('should warn on rm with wildcard', () => {
                const result = checkCommandSafety('rm *.txt');

                expect(result.needsWarning).toBe(true);
            });

            it('should warn on sudo commands', () => {
                const result = checkCommandSafety('sudo apt-get install package');

                expect(result.needsWarning).toBe(true);
            });

            it('should warn on global npm install', () => {
                const result = checkCommandSafety('npm install -g package');

                expect(result.needsWarning).toBe(true);
            });

            it('should warn on Windows del with flags', () => {
                const result = checkCommandSafety('del /s /q folder');

                expect(result.needsWarning).toBe(true);
            });
        });

        describe('Safe Commands', () => {
            it('should allow ls', () => {
                const result = checkCommandSafety('ls -la');

                expect(result.isDangerous).toBe(false);
                expect(result.needsWarning).toBe(false);
            });

            it('should allow git status', () => {
                const result = checkCommandSafety('git status');

                expect(result.isDangerous).toBe(false);
                expect(result.needsWarning).toBe(false);
            });

            it('should allow npm test', () => {
                const result = checkCommandSafety('npm test');

                expect(result.isDangerous).toBe(false);
                expect(result.needsWarning).toBe(false);
            });

            it('should allow cat', () => {
                const result = checkCommandSafety('cat file.txt');

                expect(result.isDangerous).toBe(false);
                expect(result.needsWarning).toBe(false);
            });
        });
    });

    describe('formatCommandForContext', () => {
        it('should format successful command result', () => {
            const result: CommandResult = {
                command: 'ls -la',
                stdout: 'file1.txt\nfile2.js',
                stderr: '',
                exitCode: 0,
                success: true,
            };

            const formatted = formatCommandForContext(result);

            expect(formatted).toContain('```');
            expect(formatted).toContain('Command: ls -la');
            expect(formatted).toContain('Exit Code: 0');
            expect(formatted).toContain('Output:');
            expect(formatted).toContain('file1.txt');
        });

        it('should format failed command result', () => {
            const result: CommandResult = {
                command: 'invalid-command',
                stdout: '',
                stderr: 'command not found',
                exitCode: 127,
                success: false,
            };

            const formatted = formatCommandForContext(result);

            expect(formatted).toContain('Exit Code: 127');
            expect(formatted).toContain('Errors:');
            expect(formatted).toContain('command not found');
        });

        it('should handle no output', () => {
            const result: CommandResult = {
                command: 'touch file.txt',
                stdout: '',
                stderr: '',
                exitCode: 0,
                success: true,
            };

            const formatted = formatCommandForContext(result);

            expect(formatted).toContain('(No output)');
        });

        it('should include both stdout and stderr', () => {
            const result: CommandResult = {
                command: 'npm test',
                stdout: 'Tests passed',
                stderr: 'Deprecation warning',
                exitCode: 0,
                success: true,
            };

            const formatted = formatCommandForContext(result);

            expect(formatted).toContain('Output:');
            expect(formatted).toContain('Tests passed');
            expect(formatted).toContain('Errors:');
            expect(formatted).toContain('Deprecation warning');
        });
    });

    describe('summarizeCommandResult', () => {
        it('should summarize successful command', () => {
            const result: CommandResult = {
                command: 'ls',
                stdout: 'line1\nline2\nline3',
                stderr: '',
                exitCode: 0,
                success: true,
            };

            const summary = summarizeCommandResult(result);

            expect(summary).toContain('✅ 성공');
            expect(summary).toContain('종료 코드: 0');
            expect(summary).toContain('3줄 출력');
        });

        it('should summarize failed command', () => {
            const result: CommandResult = {
                command: 'invalid',
                stdout: '',
                stderr: 'error1\nerror2',
                exitCode: 1,
                success: false,
            };

            const summary = summarizeCommandResult(result);

            expect(summary).toContain('❌ 실패');
            expect(summary).toContain('종료 코드: 1');
            expect(summary).toContain('2줄 에러');
        });

        it('should handle no output', () => {
            const result: CommandResult = {
                command: 'touch',
                stdout: '',
                stderr: '',
                exitCode: 0,
                success: true,
            };

            const summary = summarizeCommandResult(result);

            expect(summary).toContain('✅ 성공');
            expect(summary).not.toContain('줄 출력');
            expect(summary).not.toContain('줄 에러');
        });
    });
});
