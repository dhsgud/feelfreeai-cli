import * as vscode from 'vscode';
import { ProviderFactory, BaseProvider, Message } from '@feelfreeai/core';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'feelfreeai.chatView';
    private _view?: vscode.WebviewView;
    private provider?: BaseProvider;
    private messages: Message[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleSendMessage(data.message);
                    break;
                case 'clearChat':
                    this.messages = [];
                    webviewView.webview.postMessage({ type: 'clearChat' });
                    break;
            }
        });

        // Initialize provider
        this.initializeProvider();
    }

    private async initializeProvider() {
        try {
            const config = vscode.workspace.getConfiguration('feelfreeai');
            const providerType = config.get<'gemini' | 'llamacpp'>('provider', 'gemini');

            this.provider = await ProviderFactory.createFromConfig(providerType);

            this._view?.webview.postMessage({
                type: 'providerReady',
                providerName: this.provider.name
            });
        } catch (error) {
            vscode.window.showErrorMessage(
                `프로바이더 초기화 실패: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private async handleSendMessage(message: string) {
        if (!this.provider || !this._view) {
            return;
        }

        // Add user message
        this.messages.push({ role: 'user', content: message });

        try {
            const config = vscode.workspace.getConfiguration('feelfreeai');
            const streaming = config.get<boolean>('streaming', true);

            if (streaming) {
                // Streaming mode
                let fullResponse = '';
                await this.provider.stream(
                    this.messages,
                    'You are a helpful AI coding assistant.',
                    (chunk) => {
                        if (!chunk.done) {
                            fullResponse += chunk.text;
                            this._view?.webview.postMessage({
                                type: 'responseChunk',
                                text: chunk.text
                            });
                        } else {
                            this._view?.webview.postMessage({
                                type: 'responseComplete'
                            });
                            this.messages.push({ role: 'assistant', content: fullResponse });
                        }
                    }
                );
            } else {
                // Non-streaming mode
                const response = await this.provider.chat(
                    this.messages,
                    'You are a helpful AI coding assistant.'
                );

                this._view.webview.postMessage({
                    type: 'response',
                    text: response.text
                });

                this.messages.push({ role: 'assistant', content: response.text });
            }
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    public async sendMessageToChat(message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addUserMessage',
                message: message
            });
            await this.handleSendMessage(message);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FeelFree AI</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        #chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 80px);
        }
        #messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 10px;
        }
        .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 4px;
        }
        .user-message {
            background-color: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-focusBorder);
        }
        .assistant-message {
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-charts-green);
        }
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
        }
        #input-container {
            display: flex;
            gap: 5px;
        }
        #message-input {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .status {
            padding: 5px;
            text-align: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <div class="status" id="status">Ready</div>
        <div id="messages"></div>
        <div id="input-container">
            <input type="text" id="message-input" placeholder="메시지를 입력하세요..." />
            <button id="send-button">전송</button>
            <button id="clear-button">초기화</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const clearButton = document.getElementById('clear-button');
        const statusDiv = document.getElementById('status');

        let currentResponse = '';

        sendButton.addEventListener('click', sendMessage);
        clearButton.addEventListener('click', clearChat);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage('user', message);
            vscode.postMessage({ type: 'sendMessage', message });
            messageInput.value = '';
            currentResponse = '';
        }

        function clearChat() {
            messagesDiv.innerHTML = '';
            vscode.postMessage({ type: 'clearChat' });
        }

        function addMessage(role, text) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}-message\`;
            messageDiv.textContent = text;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function updateLastMessage(text) {
            const lastMessage = messagesDiv.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('assistant-message')) {
                lastMessage.textContent = text;
            } else {
                addMessage('assistant', text);
            }
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'providerReady':
                    statusDiv.textContent = \`Ready - \${message.providerName}\`;
                    break;
                case 'responseChunk':
                    currentResponse += message.text;
                    updateLastMessage(currentResponse);
                    break;
                case 'responseComplete':
                    currentResponse = '';
                    break;
                case 'response':
                    addMessage('assistant', message.text);
                    break;
                case 'error':
                    addMessage('error', 'Error: ' + message.error);
                    break;
                case 'clearChat':
                    messagesDiv.innerHTML = '';
                    break;
                case 'addUserMessage':
                    addMessage('user', message.message);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
