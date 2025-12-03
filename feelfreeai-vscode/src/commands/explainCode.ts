import * as vscode from 'vscode';
import { ChatViewProvider } from '../ChatViewProvider';

export async function explainCodeCommand(chatProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('코드를 선택해주세요.');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showWarningMessage('설명할 코드를 선택해주세요.');
        return;
    }

    const language = editor.document.languageId;
    const message = `다음 ${language} 코드를 자세히 설명해주세요:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;

    // Send to chat panel
    await chatProvider.sendMessageToChat(message);

    // Focus chat view
    vscode.commands.executeCommand('feelfreeai.chatView.focus');
}
