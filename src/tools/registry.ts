import fs from 'fs/promises';
import path from 'path';
import { Tool } from '../config/types';

/**
 * 도구 레지스트리
 */
export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        this.registerDefaultTools();
    }

    /**
     * 기본 도구 등록
     */
    private registerDefaultTools() {
        this.register({
            name: 'read_file',
            description: 'Read the content of a file in the project. Use this when you need to examine code or configuration files.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative path to the file (e.g., src/index.ts, package.json)',
                    },
                },
                required: ['path'],
            },
            execute: async (args: { path: string }) => {
                try {
                    const filePath = path.resolve(process.cwd(), args.path);

                    // 보안: 현재 작업 디렉토리 외부 파일 접근 제한 (간단한 체크)
                    if (!filePath.startsWith(process.cwd())) {
                        return { error: 'Access denied: Cannot read files outside the project directory.' };
                    }

                    const content = await fs.readFile(filePath, 'utf-8');
                    return { content };
                } catch (error) {
                    return { error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}` };
                }
            },
        });

        this.register({
            name: 'list_files',
            description: 'List files and directories in a given path. Use this to explore the project structure.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative path to list (default: .)',
                    },
                },
            },
            execute: async (args: { path?: string }) => {
                try {
                    const targetPath = path.resolve(process.cwd(), args.path || '.');

                    // 보안 체크
                    if (!targetPath.startsWith(process.cwd())) {
                        return { error: 'Access denied: Cannot list files outside the project directory.' };
                    }

                    const entries = await fs.readdir(targetPath, { withFileTypes: true });
                    const result = entries.map((entry) => ({
                        name: entry.name,
                        type: entry.isDirectory() ? 'directory' : 'file',
                    }));

                    return { files: result };
                } catch (error) {
                    return { error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}` };
                }
            },
        });

        this.register({
            name: 'get_time',
            description: 'Get the current system time.',
            parameters: {
                type: 'object',
                properties: {},
            },
            execute: async () => {
                return { time: new Date().toISOString() };
            },
        });

        this.register({
            name: 'write_file',
            description: 'Create or overwrite a file with specified content.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative path to the file',
                    },
                    content: {
                        type: 'string',
                        description: 'Content to write to the file',
                    },
                },
                required: ['path', 'content'],
            },
            execute: async (args: { path: string; content: string }) => {
                try {
                    const filePath = path.resolve(process.cwd(), args.path);
                    if (!filePath.startsWith(process.cwd())) {
                        return { error: 'Access denied: Cannot write files outside the project directory.' };
                    }
                    await fs.writeFile(filePath, args.content, 'utf-8');
                    return { success: true, message: `File written to ${args.path}` };
                } catch (error) {
                    return { error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}` };
                }
            },
        });

        this.register({
            name: 'run_command',
            description: 'Execute a shell command.',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Command to execute',
                    },
                },
                required: ['command'],
            },
            execute: async (args: { command: string }) => {
                try {
                    const { exec } = require('child_process');
                    const util = require('util');
                    const execAsync = util.promisify(exec);

                    const { stdout, stderr } = await execAsync(args.command, { cwd: process.cwd() });
                    return { stdout, stderr };
                } catch (error) {
                    return { error: `Command failed: ${error instanceof Error ? error.message : String(error)}` };
                }
            },
        });
    }

    /**
     * 도구 등록
     */
    register(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    /**
     * 모든 도구 가져오기
     */
    getTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * 도구 실행
     */
    async execute(name: string, args: any): Promise<any> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }
        return await tool.execute(args);
    }
}
