import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider';
import { explainCodeCommand } from './commands/explainCode';
import { refactorCodeCommand } from './commands/refactorCode';
import { generateTestsCommand } from './commands/generateTests';
import { askQuestionCommand } from './commands/askQuestion';

export function activate(context: vscode.ExtensionContext) {
    console.log('FeelFree AI extension is now active!');

    // Create Chat View Provider
    const chatProvider = new ChatViewProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'feelfreeai.chatView',
            chatProvider
        )
    );

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('feelfreeai.openChat', () => {
            vscode.commands.executeCommand('feelfreeai.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('feelfreeai.explainCode', () =>
            explainCodeCommand(chatProvider)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('feelfreeai.refactorCode', () =>
            refactorCodeCommand(chatProvider)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('feelfreeai.generateTests', () =>
            generateTestsCommand(chatProvider)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('feelfreeai.askQuestion', () =>
            askQuestionCommand(chatProvider)
        )
    );
}

export function deactivate() {
    console.log('FeelFree AI extension is now deactivated');
}
