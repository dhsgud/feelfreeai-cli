import chalk from 'chalk';
import inquirer from 'inquirer';
import { Message, ProviderType } from '../config/types';
import {
    createSession,
    saveSession,
    loadSession,
    listSessions,
    findSessionByName,
} from '../conversation/persistence';

/**
 * REPL 상태 인터페이스 (repl.ts와 공유)
 */
interface ReplState {
    messages: Message[];
    providerType: ProviderType;
    contextManager: {
        getFiles(): any[];
        getFileCount(): number;
        getContextSize(): number;
        clearAll(): void;
        addFile(file: any): void;
    };
}

/**
 * 세션 저장 처리
 */
export async function handleSave(state: ReplState, args: string[]): Promise<void> {
    if (state.messages.length === 0) {
        console.log(chalk.yellow('저장할 대화가 없습니다.'));
        return;
    }

    let sessionName = args.join(' ').trim();

    // 이름이 없으면 입력 받기
    if (!sessionName) {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: '세션 이름을 입력하세요 (선택사항):',
            },
        ]);
        sessionName = answer.name.trim() || undefined;
    }

    const session = createSession(state.messages, state.providerType, sessionName);
    await saveSession(session);

    console.log(chalk.green(`\n✅ 대화가 저장되었습니다!`));
    console.log(chalk.gray(`세션 ID: ${session.id}`));
    if (sessionName) {
        console.log(chalk.gray(`이름: ${sessionName}`));
    }
    console.log();
}

/**
 * 세션 불러오기 처리
 */
export async function handleLoad(state: ReplState, args: string[]): Promise<void> {
    const sessions = await listSessions();

    if (sessions.length === 0) {
        console.log(chalk.yellow('저장된 세션이 없습니다.'));
        return;
    }

    // 인자로 세션 이름/ID가 제공되었으면 직접 로드
    if (args.length > 0) {
        const query = args.join(' ').trim();
        let session = await findSessionByName(query);
        if (!session) {
            session = await loadSession(query);
        }

        if (session) {
            state.messages = session.messages;
            console.log(chalk.green(`\n✅ 세션을 불러왔습니다!`));
            console.log(chalk.gray(`세션 ID: ${session.id}`));
            if (session.name) {
                console.log(chalk.gray(`이름: ${session.name}`));
            }
            console.log(chalk.gray(`메시지 수: ${session.messages.length}`));
            console.log();
        } else {
            console.log(chalk.red(`세션을 찾을 수 없습니다: ${query}`));
        }
        return;
    }

    // 목록에서 선택
    const choices = sessions.map((s) => ({
        name: `${s.name || '(이름 없음)'} - ${s.messages.length}개 메시지 (${formatDate(s.updatedAt)})`,
        value: s.id,
    }));

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'sessionId',
            message: '불러올 세션을 선택하세요:',
            choices,
            pageSize: 10,
        },
    ]);

    const session = await loadSession(answer.sessionId);
    if (session) {
        state.messages = session.messages;
        console.log(chalk.green(`\n✅ 세션을 불러왔습니다!`));
        console.log(chalk.gray(`메시지 수: ${session.messages.length}\n`));
    }
}

/**
 * 세션 목록 표시
 */
export async function handleListSessions(): Promise<void> {
    const sessions = await listSessions();

    if (sessions.length === 0) {
        console.log(chalk.yellow('\n저장된 세션이 없습니다.\n'));
        return;
    }

    console.log(chalk.bold.blue('\n💾 저장된 세션\n'));
    for (const session of sessions) {
        console.log(chalk.bold(session.name || '(이름 없음)'));
        console.log(chalk.gray(`  ID: ${session.id}`));
        console.log(chalk.gray(`  메시지: ${session.messages.length}개`));
        console.log(chalk.gray(`  마지막 수정: ${formatDate(session.updatedAt)}`));
        console.log(chalk.gray(`  프로바이더: ${session.provider}`));
        console.log();
    }
}

/**
 * 날짜 포맷팅
 */
function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}일 전`;
    } else if (hours > 0) {
        return `${hours}시간 전`;
    } else if (minutes > 0) {
        return `${minutes}분 전`;
    } else {
        return '방금 전';
    }
}
