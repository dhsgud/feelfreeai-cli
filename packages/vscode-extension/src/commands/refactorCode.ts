import * as vscode from 'vscode';
import { ChatViewProvider } from '../ChatViewProvider';

export async function refactorCodeCommand(chatProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('코드를 선택해주세요.');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showWarningMessage('리팩토링할 코드를 선택해주세요.');
        return;
    }

    const language = editor.document.languageId;
    const message = `다음 ${language} 코드를 리팩토링해주세요. 더 깔끔하고 효율적으로 개선하고, 개선 사항을 설명해주세요:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;

    await chatProvider.sendMessageToChat(message);
    vscode.commands.executeCommand('feelfreeai.chatView.focus');
}
