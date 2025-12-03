import * as vscode from 'vscode';
import { GeminiProvider } from './providers/gemini';
import { LlamaCppProvider } from './providers/llamacpp';
import { BaseProvider } from './providers/base';
import { Message } from './config/types';

interface ChatSession {
    id: string;
    title: string;
    date: number;
    messages: Message[];
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'feelfreeai.chatView';
    private _view?: vscode.WebviewView;
    private provider?: BaseProvider;
    private messages: Message[] = [];
    private currentSessionId: string = Date.now().toString();
    private abortController?: AbortController;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        // 설정 변경 감지
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('feelfreeai.provider') ||
                e.affectsConfiguration('feelfreeai.geminiApiKey') ||
                e.affectsConfiguration('feelfreeai.geminiModel') ||
                e.affectsConfiguration('feelfreeai.llamacppEndpoint')) {
                this.initializeProvider();
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
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
                    await this.handleSendMessage(data.message, data.images);
                    break;
                case 'clearChat':
                    this.startNewSession();
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'feelfreeai');
                    break;
                case 'changeProvider':
                    await vscode.workspace.getConfiguration('feelfreeai').update('provider', data.provider, vscode.ConfigurationTarget.Global);
                    break;
                case 'changeModel':
                    await vscode.workspace.getConfiguration('feelfreeai').update('geminiModel', data.model, vscode.ConfigurationTarget.Global);
                    break;
                case 'loadSession':
                    this.loadSession(data.sessionId);
                    break;
                case 'deleteSession':
                    this.deleteSession(data.sessionId);
                    break;
                case 'ready':
                    this.initializeProvider();
                    this.sendHistoryToWebview();
                    break;
                case 'stopGeneration':
                    this.stopGeneration();
                    break;
                case 'selectImage':
                    this.handleSelectImage();
                    break;
            }
        });
    }

    private async initializeProvider() {
        try {
            const config = vscode.workspace.getConfiguration('feelfreeai');
            const providerType = config.get<'gemini' | 'llamacpp'>('provider', 'gemini');

            if (providerType === 'gemini') {
                const apiKey = config.get<string>('geminiApiKey', '');
                const model = config.get<string>('geminiModel', 'gemini-1.5-flash');

                if (!apiKey) {
                    const errorMsg = 'Gemini API 키가 설정되지 않았습니다.';
                    this._view?.webview.postMessage({ type: 'error', error: errorMsg });
                    return;
                }

                this.provider = new GeminiProvider({
                    apiKey,
                    model,
                    temperature: 0.7,
                    maxTokens: 2048
                });
            } else {
                const endpoint = config.get<string>('llamacppEndpoint', 'http://localhost:8080');

                this.provider = new LlamaCppProvider({
                    endpoint,
                    temperature: 0.7,
                    maxTokens: 2048
                });
            }

            this._view?.webview.postMessage({
                type: 'providerReady',
                providerName: this.provider.name,
                modelName: providerType === 'gemini' ? config.get<string>('geminiModel') : 'Llama 2'
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this._view?.webview.postMessage({ type: 'error', error: errorMsg });
        }
    }

    private async handleSendMessage(message: string, images?: { mimeType: string; data: string }[]) {
        if (!this.provider || !this._view) {
            return;
        }

        let content: string | { type: 'text'; text: string } | { type: 'image'; image: { mimeType: string; data: string } }[] = message;

        if (images && images.length > 0) {
            const parts: any[] = [];
            // 텍스트를 먼저 추가 (비어있으면 기본 텍스트 추가)
            const textContent = message.trim() || "이 이미지에 대해 설명해줘";
            parts.push({ type: 'text', text: textContent });

            // 이미지를 나중에 추가
            for (const img of images) {
                parts.push({ type: 'image', image: img });
            }
            content = parts;
        }

        this.messages.push({ role: 'user', content: content as any });
        this.saveCurrentSession(); // 메시지 추가 시 저장

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        try {
            const config = vscode.workspace.getConfiguration('feelfreeai');
            const streaming = config.get<boolean>('streaming', true);

            // 컨텍스트 사용량 업데이트 (추정치)
            this.updateContextUsage();

            if (streaming) {
                let fullResponse = '';
                await this.provider.stream(
                    this.messages,
                    'You are a helpful AI coding assistant.',
                    (chunk) => {
                        if (signal.aborted) return;

                        if (!chunk.done) {
                            fullResponse += chunk.text;
                            this._view?.webview.postMessage({
                                type: 'responseChunk',
                                text: chunk.text
                            });
                        } else {
                            this._view?.webview.postMessage({ type: 'responseComplete' });
                            this.messages.push({ role: 'assistant', content: fullResponse });
                            this.saveCurrentSession(); // 응답 완료 시 저장
                            this.updateContextUsage();
                            this.abortController = undefined;
                        }
                    },
                    signal
                );
            } else {
                const response = await this.provider.chat(
                    this.messages,
                    'You are a helpful AI coding assistant.'
                );

                if (signal.aborted) return;

                this._view.webview.postMessage({
                    type: 'response',
                    text: response.text
                });

                this.messages.push({ role: 'assistant', content: response.text });
                this.saveCurrentSession();
                this.updateContextUsage();
                this.abortController = undefined;
            }
        } catch (error) {
            if (signal.aborted) return;

            this._view.webview.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
            this.abortController = undefined;
        }
    }

    private stopGeneration() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = undefined;
            this._view?.webview.postMessage({ type: 'responseComplete' });
            // Add a message indicating cancellation?
            // this.messages.push({ role: 'assistant', content: '[Cancelled]' });
        }
    }

    private async handleSelectImage() {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            filters: {
                'Images': ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif']
            }
        });

        if (result && result.length > 0) {
            const images = [];
            for (const uri of result) {
                try {
                    const data = await vscode.workspace.fs.readFile(uri);
                    const base64 = Buffer.from(data).toString('base64');
                    const mimeType = this.getMimeType(uri.fsPath);
                    images.push({ mimeType, data: base64, name: uri.path.split('/').pop() });
                } catch (e) {
                    console.error('Failed to read image:', e);
                }
            }
            this._view?.webview.postMessage({ type: 'imagesSelected', images });
        }
    }

    private getMimeType(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'webp': return 'image/webp';
            case 'heic': return 'image/heic';
            case 'heif': return 'image/heif';
            default: return 'application/octet-stream';
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

    // --- Session Management ---

    private getSessions(): ChatSession[] {
        return this._context.globalState.get<ChatSession[]>('chatSessions', []);
    }

    private async saveSessions(sessions: ChatSession[]) {
        await this._context.globalState.update('chatSessions', sessions);
        this.sendHistoryToWebview();
    }

    private startNewSession() {
        this.messages = [];
        this.currentSessionId = Date.now().toString();
        this._view?.webview.postMessage({ type: 'clearChat' });
        this.updateContextUsage();
    }

    private async saveCurrentSession() {
        if (this.messages.length === 0) return;

        const sessions = this.getSessions();
        const existingIndex = sessions.findIndex(s => s.id === this.currentSessionId);

        const title = this.messages[0].content.slice(0, 30) + (this.messages[0].content.length > 30 ? '...' : '');

        const session: ChatSession = {
            id: this.currentSessionId,
            title: title || 'New Chat',
            date: Date.now(),
            messages: this.messages
        };

        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        } else {
            sessions.unshift(session);
        }

        await this.saveSessions(sessions);
    }

    private loadSession(sessionId: string) {
        const sessions = this.getSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            this.currentSessionId = session.id;
            this.messages = session.messages;

            this._view?.webview.postMessage({ type: 'clearChat' });

            for (const msg of this.messages) {
                this._view?.webview.postMessage({
                    type: msg.role === 'user' ? 'addUserMessage' : 'response',
                    message: typeof msg.content === 'string' ? msg.content : '[Multimodal Content]',
                    text: typeof msg.content === 'string' ? msg.content : '[Multimodal Content]'
                });
            }
            this.updateContextUsage();
        }
    }

    private async deleteSession(sessionId: string) {
        let sessions = this.getSessions();
        sessions = sessions.filter(s => s.id !== sessionId);
        await this.saveSessions(sessions);

        if (this.currentSessionId === sessionId) {
            this.startNewSession();
        }
    }

    private sendHistoryToWebview() {
        const sessions = this.getSessions();
        this._view?.webview.postMessage({
            type: 'historyUpdate',
            sessions: sessions.map(s => ({ id: s.id, title: s.title, date: s.date }))
        });
    }

    private updateContextUsage() {
        // 간단한 토큰 추정 (4자 = 1토큰)
        const totalChars = this.messages.reduce((acc, msg) => {
            if (typeof msg.content === 'string') {
                return acc + msg.content.length;
            } else {
                // 멀티모달 콘텐츠 길이 추정
                return acc + JSON.stringify(msg.content).length;
            }
        }, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        const maxTokens = 1000000; // 1M context window for Gemini 1.5

        this._view?.webview.postMessage({
            type: 'updateContext',
            used: estimatedTokens,
            total: maxTokens
        });
    }

    private _getHtmlForWebview(_webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FeelFree AI</title>
    <style>
        :root {
            --container-paddding: 20px;
            --input-padding-vertical: 6px;
            --input-padding-horizontal: 4px;
            --input-margin-vertical: 4px;
            --input-margin-horizontal: 0;
        }

        body {
            margin: 0;
            padding: 0;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-weight: var(--vscode-font-weight);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-sideBar-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        /* Header */
        #header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }

        #header-title {
            font-weight: 600;
            font-size: 13px;
        }

        #header-actions {
            display: flex;
            gap: 4px;
        }

        .icon-button {
            background: none;
            border: none;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-button:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }

        /* History Sidebar */
        #history-sidebar {
            position: absolute;
            top: 40px;
            left: 0;
            bottom: 0;
            width: 250px;
            background-color: var(--vscode-sideBar-background);
            border-right: 1px solid var(--vscode-panel-border);
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
        }

        #history-sidebar.open {
            transform: translateX(0);
            box-shadow: 2px 0 5px rgba(0,0,0,0.2);
        }

        #history-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .history-item {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
        }

        .history-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .history-item-title {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }

        .delete-session-btn {
            opacity: 0;
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 2px;
        }

        .history-item:hover .delete-session-btn {
            opacity: 1;
        }

        .delete-session-btn:hover {
            color: var(--vscode-errorForeground);
        }

        /* Main Content */
        #main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        #messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 6px;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message-role {
            font-size: 11px;
            font-weight: 600;
            opacity: 0.8;
            text-transform: uppercase;
        }

        .user-message .message-role { color: var(--vscode-textLink-foreground); }
        .assistant-message .message-role { color: var(--vscode-charts-green); }

        .message-content {
            padding: 10px 14px;
            border-radius: 6px;
            line-height: 1.5;
            font-size: 13px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .user-message .message-content {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }

        .assistant-message .message-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
        }

        /* Input Area */
        #input-area {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-sideBar-background);
        }

        #context-bar {
            height: 4px;
            background-color: var(--vscode-progressBar-background);
            margin-bottom: 8px;
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }

        #context-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-background); /* Fallback */
            background: linear-gradient(90deg, var(--vscode-charts-blue), var(--vscode-charts-purple));
            width: 0%;
            transition: width 0.3s ease;
        }

        #context-text {
            position: absolute;
            top: -16px;
            right: 0;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }

        #controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        select {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px;
            border-radius: 4px;
            outline: none;
            font-family: inherit;
        }

        #input-box {
            display: flex;
            gap: 8px;
            align-items: flex-end;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 8px;
        }

        #input-box:focus-within {
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--vscode-input-foreground);
            font-family: inherit;
            resize: none;
            outline: none;
            min-height: 20px;
            max-height: 200px;
            padding: 0;
        }

        #send-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        #send-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        #send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Empty State */
        #empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            opacity: 0.6;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="header">
        <div id="header-title">FeelFree AI</div>
        <div id="header-actions">
            <button class="icon-button" id="history-btn" title="히스토리">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 1 0 7 7 7.01 7.01 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6.01 6.01 0 0 1-6 6z"/>
                    <path d="M8.5 4v4.5H12v-1H9.5V4h-1z"/>
                </svg>
            </button>
            <button class="icon-button" id="new-chat-btn" title="새 채팅">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 3H2v10h12V3zm-1 9H3V4h10v8z"/>
                    <path d="M12 1H4v1h8V1zm0 13H4v1h8v-1z"/>
                </svg>
            </button>
            <button class="icon-button" id="settings-btn" title="설정">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.4h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                </svg>
            </button>
        </div>
    </div>

    <div id="history-sidebar">
        <div style="padding: 12px; font-weight: 600; border-bottom: 1px solid var(--vscode-panel-border);">Chat History</div>
        <div id="history-list"></div>
    </div>

    <div id="main-content">
        <div id="messages-container">
            <div id="empty-state">
                <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                <div>AI에게 무엇이든 물어보세요</div>
            </div>
        </div>

        <div id="input-area">
            <div id="context-text">0 / 1M tokens</div>
            <div id="context-bar">
                <div id="context-fill"></div>
            </div>
            
            <div id="controls">
                <select id="provider-select">
                    <option value="gemini">Gemini</option>
                    <option value="llamacpp">Llama.cpp</option>
                </select>
                <select id="model-select">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Preview)</option>
                </select>
            </div>

            <div id="input-box">
                <div id="image-preview-area" style="display: none; padding: 4px; gap: 4px; overflow-x: auto;"></div>
                <div style="display: flex; width: 100%; align-items: flex-end; gap: 8px;">
                    <button id="attach-btn" class="icon-button" title="이미지 첨부">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.5 3h7a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3zm0 1a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-7z"/>
                            <path d="M5 8l2-2 2 2 2-2 2 2v3H5V8z"/>
                        </svg>
                    </button>
                    <textarea id="message-input" placeholder="메시지를 입력하세요... (Ctrl+Enter)" rows="1"></textarea>
                    <button id="stop-btn" style="display: none; background-color: var(--vscode-errorForeground); color: white; border: none; border-radius: 4px; width: 28px; height: 28px; align-items: center; justify-content: center; cursor: pointer;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 4h8v8H4z"/>
                        </svg>
                    </button>
                    <button id="send-btn" disabled>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 8.5L14.5 2 8 15.5 6.5 9.5 1.5 8.5z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Elements
        const messagesContainer = document.getElementById('messages-container');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const stopBtn = document.getElementById('stop-btn');
        const attachBtn = document.getElementById('attach-btn');
        const imagePreviewArea = document.getElementById('image-preview-area');
        const providerSelect = document.getElementById('provider-select');
        const modelSelect = document.getElementById('model-select');
        const historySidebar = document.getElementById('history-sidebar');
        const historyList = document.getElementById('history-list');
        const contextFill = document.getElementById('context-fill');
        const contextText = document.getElementById('context-text');
        const emptyState = document.getElementById('empty-state');

        // State
        let currentResponse = '';
        let selectedImages = [];
        let isGenerating = false;

        // Initialize
        vscode.postMessage({ type: 'ready' });

        // Event Listeners
        document.getElementById('history-btn').addEventListener('click', () => {
            historySidebar.classList.toggle('open');
        });

        document.getElementById('new-chat-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
            historySidebar.classList.remove('open');
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'openSettings' });
        });

        attachBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'selectImage' });
        });

        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'stopGeneration' });
            setGenerating(false);
        });

        providerSelect.addEventListener('change', (e) => {
            const provider = e.target.value;
            vscode.postMessage({ type: 'changeProvider', provider });
            modelSelect.style.display = provider === 'gemini' ? 'block' : 'none';
        });

        modelSelect.addEventListener('change', (e) => {
            vscode.postMessage({ type: 'changeModel', model: e.target.value });
        });

        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
            updateSendButton();
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);

        function updateSendButton() {
            sendBtn.disabled = !messageInput.value.trim() && selectedImages.length === 0;
        }

        function setGenerating(generating) {
            isGenerating = generating;
            sendBtn.style.display = generating ? 'none' : 'flex';
            stopBtn.style.display = generating ? 'flex' : 'none';
            messageInput.disabled = generating;
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text && selectedImages.length === 0) return;

            addMessage('user', text, selectedImages);
            
            // Prepare images for sending (only mimeType and data)
            const imagesToSend = selectedImages.map(img => ({ mimeType: img.mimeType, data: img.data }));
            
            vscode.postMessage({ type: 'sendMessage', message: text, images: imagesToSend });
            
            messageInput.value = '';
            messageInput.style.height = 'auto';
            selectedImages = [];
            renderImagePreviews();
            updateSendButton();
            currentResponse = '';
            setGenerating(true);
            
            if (emptyState) emptyState.style.display = 'none';
        }

        function addMessage(role, text, images = []) {
            if (emptyState) emptyState.style.display = 'none';

            const div = document.createElement('div');
            div.className = \`message \${role}-message\`;
            
            let contentHtml = '';
            
            if (images && images.length > 0) {
                contentHtml += '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">';
                images.forEach(img => {
                    contentHtml += \`<img src="data:\${img.mimeType};base64,\${img.data}" style="max-width: 200px; max-height: 200px; border-radius: 4px;">\`;
                });
                contentHtml += '</div>';
            }
            
            if (text) {
                contentHtml += \`<div class="message-content">\${text}</div>\`;
            }

            div.innerHTML = \`
                <div class="message-role">\${role === 'user' ? 'You' : 'FeelFree AI'}</div>
                \${contentHtml}
            \`;
            messagesContainer.appendChild(div);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function renderImagePreviews() {
            imagePreviewArea.innerHTML = '';
            if (selectedImages.length > 0) {
                imagePreviewArea.style.display = 'flex';
                selectedImages.forEach((img, index) => {
                    const div = document.createElement('div');
                    div.style.position = 'relative';
                    div.innerHTML = \`
                        <img src="data:\${img.mimeType};base64,\${img.data}" style="height: 40px; border-radius: 4px;">
                        <button class="remove-img-btn" style="position: absolute; top: -4px; right: -4px; background: red; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer;">×</button>
                    \`;
                    div.querySelector('.remove-img-btn').onclick = () => {
                        selectedImages.splice(index, 1);
                        renderImagePreviews();
                        updateSendButton();
                    };
                    imagePreviewArea.appendChild(div);
                });
            } else {
                imagePreviewArea.style.display = 'none';
            }
        }

        function updateLastMessage(text) {
            const lastMsg = messagesContainer.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('assistant-message')) {
                // If the last message has a text content div, update it. Otherwise create it.
                let contentDiv = lastMsg.querySelector('.message-content');
                if (!contentDiv) {
                    contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    lastMsg.appendChild(contentDiv);
                }
                contentDiv.textContent = text;
            } else {
                addMessage('assistant', text);
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function renderHistory(sessions) {
            historyList.innerHTML = '';
            sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = \`
                    <span class="history-item-title">\${session.title}</span>
                    <button class="delete-session-btn" title="삭제">×</button>
                \`;
                
                item.onclick = (e) => {
                    if (e.target.classList.contains('delete-session-btn')) {
                        e.stopPropagation();
                        vscode.postMessage({ type: 'deleteSession', sessionId: session.id });
                    } else {
                        vscode.postMessage({ type: 'loadSession', sessionId: session.id });
                        historySidebar.classList.remove('open');
                    }
                };
                historyList.appendChild(item);
            });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.type) {
                case 'providerReady':
                    if (msg.providerName.toLowerCase().includes('gemini')) {
                        providerSelect.value = 'gemini';
                        modelSelect.style.display = 'block';
                        if (msg.modelName) modelSelect.value = msg.modelName;
                    } else {
                        providerSelect.value = 'llamacpp';
                        modelSelect.style.display = 'none';
                    }
                    break;
                case 'responseChunk':
                    currentResponse += msg.text;
                    updateLastMessage(currentResponse);
                    break;
                case 'responseComplete':
                    currentResponse = '';
                    setGenerating(false);
                    break;
                case 'response':
                    addMessage('assistant', msg.text);
                    setGenerating(false);
                    break;
                case 'addUserMessage':
                    addMessage('user', msg.message);
                    break;
                case 'imagesSelected':
                    selectedImages.push(...msg.images);
                    renderImagePreviews();
                    updateSendButton();
                    break;
                case 'error':
                    // Handle error display
                    const errorDiv = document.createElement('div');
                    errorDiv.style.color = 'var(--vscode-errorForeground)';
                    errorDiv.style.padding = '8px';
                    errorDiv.textContent = 'Error: ' + msg.error;
                    messagesContainer.appendChild(errorDiv);
                    setGenerating(false);
                    break;
                case 'clearChat':
                    messagesContainer.innerHTML = '';
                    if (emptyState) {
                        emptyState.style.display = 'flex';
                        messagesContainer.appendChild(emptyState);
                    }
                    break;
                case 'historyUpdate':
                    renderHistory(msg.sessions);
                    break;
                case 'updateContext':
                    const percent = Math.min((msg.used / msg.total) * 100, 100);
                    contextFill.style.width = percent + '%';
                    contextText.textContent = \`\${msg.used.toLocaleString()} / \${(msg.total / 1000).toFixed(0)}k tokens\`;
                    break;
                case 'error':
                    addMessage('error', msg.error);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
