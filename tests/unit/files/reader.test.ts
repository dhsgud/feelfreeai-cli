import { readFile, readDirectory, FileReadResult } from '../../../src/files/reader';
import fs from 'fs/promises';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('File Reader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('readFile', () => {
        it('should read an existing file successfully', async () => {
            const mockContent = 'test file content';
            mockFs.readFile.mockResolvedValue(mockContent);
            mockFs.stat.mockResolvedValue({ size: mockContent.length, isDirectory: () => false } as any);

            const result = await readFile('test.txt');

            expect(result.exists).toBe(true);
            expect(result.content).toBe(mockContent);
            expect(result.size).toBe(mockContent.length);
        });

        it('should handle non-existent file', async () => {
            const error: any = new Error('ENOENT');
            error.code = 'ENOENT';
            mockFs.readFile.mockRejectedValue(error);

            const result = await readFile('nonexistent.txt');

            expect(result.exists).toBe(false);
            expect(result.content).toBe('');
        });

        it('should handle read errors gracefully', async () => {
            const error = new Error('Permission denied');
            mockFs.readFile.mockRejectedValue(error);

            await expect(readFile('protected.txt')).rejects.toThrow('Permission denied');
        });
    });

    describe('readDirectory', () => {
        it('should list files in directory', async () => {
            const mockFiles = [
                { name: 'file1.txt', isDirectory: () => false },
                { name: 'file2.js', isDirectory: () => false },
                { name: 'subdirectory', isDirectory: () => true },
            ] as any;
            mockFs.readdir.mockResolvedValue(mockFiles);

            const result = await readDirectory('testdir');

            expect(result).toContain('📄 file1.txt');
            expect(result).toContain('📄 file2.js');
            expect(result).toContain('📁 subdirectory');
        });

        it('should handle empty directory', async () => {
            mockFs.readdir.mockResolvedValue([] as any);

            const result = await readDirectory('emptydir');

            expect(result).toEqual([]);
        });

        it('should handle directory read errors', async () => {
            const error: any = new Error('ENOENT');
            error.code = 'ENOENT';
            mockFs.readdir.mockRejectedValue(error);

            await expect(readDirectory('nonexistent')).rejects.toThrow();
        });
    });
});
