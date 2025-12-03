import * as vscode from 'vscode';
import { ChatViewProvider } from '../ChatViewProvider';

export async function askQuestionCommand(chatProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    const question = await vscode.window.showInputBox({
        prompt: 'AI에게 질문하세요',
        placeHolder: '예: 이 프로젝트의 아키텍처를 설명해주세요'
    });

    if (!question) {
        return;
    }

    let message = question;

    // If there's selected code, include it in the context
    if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (selectedText) {
            const language = editor.document.languageId;
            message = `${question}\n\n참고 코드:\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        }
    }

    await chatProvider.sendMessageToChat(message);
    vscode.commands.executeCommand('feelfreeai.chatView.focus');
}
