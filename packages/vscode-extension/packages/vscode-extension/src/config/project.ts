import path from 'path';
import fs from 'fs/promises';
import { ProjectConfig } from './types';

/**
 * FEELFREE.md 파일명
 */
const PROJECT_FILE = 'FEELFREE.md';

/**
 * 프로젝트 설정 파일명
 */
const PROJECT_SETTINGS_FILE = '.feelfreeai/settings.json';

/**
 * 현재 디렉토리에서 프로젝트 컨텍스트 파일 찾기
 */
export const findProjectFile = async (startDir: string = process.cwd()): Promise<string | null> => {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const filePath = path.join(currentDir, PROJECT_FILE);
        try {
            await fs.access(filePath);
            return filePath;
        } catch {
            // 파일이 없으면 상위 디렉토리로 이동
            currentDir = path.dirname(currentDir);
        }
    }

    return null;
};

/**
 * 프로젝트 컨텍스트 읽기
 */
export const readProjectContext = async (): Promise<string | null> => {
    const projectFile = await findProjectFile();
    if (!projectFile) {
        return null;
    }

    try {
        const content = await fs.readFile(projectFile, 'utf-8');
        return content;
    } catch (error) {
        console.error('프로젝트 파일 읽기 실패:', error);
        return null;
    }
};

/**
 * 프로젝트 설정 읽기
 */
export const readProjectConfig = async (): Promise<ProjectConfig | null> => {
    const projectFile = await findProjectFile();
    if (!projectFile) {
        return null;
    }

    const projectDir = path.dirname(projectFile);
    const settingsPath = path.join(projectDir, PROJECT_SETTINGS_FILE);

    try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        return JSON.parse(data) as ProjectConfig;
    } catch (error) {
        // 설정 파일이 없으면 null 반환
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};

/**
 * 프로젝트 초기화 (FEELFREE.md 생성)
 */
export const initProject = async (directory: string = process.cwd()): Promise<void> => {
    const filePath = path.join(directory, PROJECT_FILE);

    // 이미 파일이 존재하는지 확인
    try {
        await fs.access(filePath);
        throw new Error('FEELFREE.md 파일이 이미 존재합니다.');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }

    // 기본 템플릿 생성
    const template = `# 프로젝트 컨텍스트

이 파일은 FeelFree AI가 프로젝트를 이해하는 데 도움을 줍니다.

## 프로젝트 개요

[프로젝트에 대한 간단한 설명을 작성하세요]

## 기술 스택

- 언어: 
- 프레임워크: 
- 주요 라이브러리: 

## 코딩 스타일 가이드

[팀의 코딩 규칙을 작성하세요]

## 아키텍처 노트

[프로젝트 구조와 설계 결정사항을 작성하세요]

## 중요 사항

[AI가 알아야 할 중요한 정보를 작성하세요]
`;

    await fs.writeFile(filePath, template, 'utf-8');
};

/**
 * 커스텀 명령어 디렉토리 찾기
 */
export const findCustomCommandsDir = async (): Promise<string | null> => {
    const projectFile = await findProjectFile();
    if (!projectFile) {
        return null;
    }

    const projectDir = path.dirname(projectFile);
    const commandsDir = path.join(projectDir, '.feelfreeai', 'commands');

    try {
        await fs.access(commandsDir);
        return commandsDir;
    } catch {
        return null;
    }
};
