import * as vscode from 'vscode';
import { ChatViewProvider } from '../ChatViewProvider';

export async function generateTestsCommand(chatProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('코드를 선택해주세요.');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showWarningMessage('테스트를 생성할 코드를 선택해주세요.');
        return;
    }

    const language = editor.document.languageId;
    const message = `다음 ${language} 코드에 대한 단위 테스트를 생성해주세요:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;

    await chatProvider.sendMessageToChat(message);
    vscode.commands.executeCommand('feelfreeai.chatView.focus');
}
