import * as vscode from 'vscode';
import { GeminiProvider } from './providers/gemini';
import { LlamaCppProvider } from './providers/llamacpp';
import { BaseProvider } from './providers/base';
import { Message } from './config/types';
import { searchWorkspaceFiles, getFileContent, getRelativePath } from './files/fileSearch';

interface ChatSession {
    id: string;
    title: string;
    date: number;
    messages: Message[];
}

export interface ContextItem {
    type: 'file' | 'directory' | 'image';
    name: string;
    path: string;
    uri?: string;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'feelfreeai.chatView';
    private _view?: vscode.WebviewView;
    private provider?: BaseProvider;
    private messages: Message[] = [];
    private currentSessionId: string = Date.now().toString();
    private abortController?: AbortController;
    private contextItems: ContextItem[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
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
                    this.sendContextItems();
                    break;
                case 'stopGeneration':
                    this.stopGeneration();
                    break;
                case 'selectImage':
                    this.handleSelectImage();
                    break;
                case 'searchFiles':
                    await this.handleSearchFiles(data.query);
                    break;
                case 'addContextItem':
                    await this.handleAddContextItem(data.item);
                    break;
                case 'removeContextItem':
                    this.handleRemoveContextItem(data.path);
                    break;
                case 'selectFileForContext':
                    await this.handleSelectFileForContext();
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
                    const errorMsg = 'Gemini API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲??';
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

        let enhancedMessage = message;
        if (this.contextItems.length > 0) {
            let contextPart = '';
            for (const item of this.contextItems) {
                if (item.type === 'file' && item.uri) {
                    try {
                        const content = await getFileContent(vscode.Uri.parse(item.uri));
                        contextPart += `\n\nFile: ${item.name}\n\`\`\`\n${content}\n\`\`\`\n`;
                    } catch (error) {
                        console.error('Error reading file:', error);
                    }
                }
            }
            if (contextPart) {
                enhancedMessage = `${contextPart}\n\n${message}`;
            }
        }

        let content: string | { type: 'text'; text: string } | { type: 'image'; image: { mimeType: string; data: string } }[] = enhancedMessage;

        if (images && images.length > 0) {
            const parts: any[] = [];
            const textContent = enhancedMessage.trim() || "???대?吏??????ㅻ챸?댁쨾";
            parts.push({ type: 'text', text: textContent });

            for (const img of images) {
                parts.push({ type: 'image', image: img });
            }
            content = parts;
        }

        this.messages.push({ role: 'user', content: content as any });
        this.saveCurrentSession();

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        try {
            const config = vscode.workspace.getConfiguration('feelfreeai');
            const streaming = config.get<boolean>('streaming', true);

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
                            this.saveCurrentSession();
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
        this.contextItems = [];
        this._view?.webview.postMessage({ type: 'clearChat' });
        this.sendContextItems();
        this.updateContextUsage();
    }

    private async saveCurrentSession() {
        if (this.messages.length === 0) return;

        const sessions = this.getSessions();
        const existingIndex = sessions.findIndex(s => s.id === this.currentSessionId);

        const title = this.messages[0].content.toString().slice(0, 30) + (this.messages[0].content.toString().length > 30 ? '...' : '');

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

    // --- Context Items Management ---

    private sendContextItems() {
        this._view?.webview.postMessage({
            type: 'contextItemsUpdate',
            items: this.contextItems
        });
    }

    private async handleSearchFiles(query: string) {
        try {
            const files = await searchWorkspaceFiles(query, 20);
            const results = files.map(uri => ({
                name: uri.path.split('/').pop() || '',
                path: getRelativePath(uri),
                uri: uri.toString()
            }));
            this._view?.webview.postMessage({
                type: 'fileSearchResults',
                results
            });
        } catch (error) {
            console.error('File search error:', error);
        }
    }

    private async handleAddContextItem(item: ContextItem) {
        const exists = this.contextItems.some(i => i.path === item.path);
        if (!exists) {
            this.contextItems.push(item);
            this.sendContextItems();
        }
    }

    private handleRemoveContextItem(path: string) {
        this.contextItems = this.contextItems.filter(item => item.path !== path);
        this.sendContextItems();
    }

    private async handleSelectFileForContext() {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: '?뚯씪 異붽?'
        });

        if (result && result.length > 0) {
            for (const uri of result) {
                const item: ContextItem = {
                    type: 'file',
                    name: uri.path.split('/').pop() || '',
                    path: getRelativePath(uri),
                    uri: uri.toString()
                };
                await this.handleAddContextItem(item);
            }
        }
    }

    private updateContextUsage() {
        const totalChars = this.messages.reduce((acc, msg) => {
            if (typeof msg.content === 'string') {
                return acc + msg.content.length;
            } else {
                return acc + JSON.stringify(msg.content).length;
            }
        }, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        const maxTokens = 1000000;

        this._view?.webview.postMessage({
            type: 'updateContext',
            used: estimatedTokens,
            total: maxTokens
        });
    }

    // HTML will be in the next file
    private _getHtmlForWebview(_webview: vscode.Webview) {
        // This will be replaced with the full HTML
        return '';
    }
}
// Part 2: HTML怨?CSS
// ???댁슜? _getHtmlForWebview 硫붿꽌?쒖쓽 return 媛믪엯?덈떎

const htmlContent = `<!DOCTYPE html>
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

        /* Context Items Section */
        #context-items-section {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
            display: none;
        }

        #context-items-section.visible {
            display: block;
        }

        #context-items-header {
            font-size: 11px;
            font-weight: 600;
            opacity: 0.8;
            margin-bottom: 8px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        #context-items-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .context-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 12px;
        }

        .context-item-remove {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin-left: 4px;
            opacity: 0.7;
        }

        .context-item-remove:hover {
            opacity: 1;
        }

        #add-context-btn {
            padding: 4px 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }

        #add-context-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        /* Messages Container */
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
            position: relative;
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

        /* Autocomplete Dropdown */
        #autocomplete-dropdown {
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            max-height: 200px;
            overflow-y: auto;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            margin-bottom: 4px;
            display: none;
            z-index: 1000;
        }

        #autocomplete-dropdown.visible {
            display: block;
        }

        .autocomplete-item {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .autocomplete-item:hover,
        .autocomplete-item.selected {
            background-color: var(--vscode-list-hoverBackground);
        }

        .autocomplete-file-icon {
            opacity: 0.7;
        }

        .autocomplete-file-name {
            font-weight: 500;
        }

        .autocomplete-file-path {
            opacity: 0.6;
            font-size: 11px;
            margin-left: auto;
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
            <button class="icon-button" id="history-btn" title="?덉뒪?좊━">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 1 0 7 7 7.01 7.01 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6.01 6.01 0 0 1-6 6z"/>
                    <path d="M8.5 4v4.5H12v-1H9.5V4h-1z"/>
                </svg>
            </button>
            <button class="icon-button" id="new-chat-btn" title="??梨꾪똿">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 3H2v10h12V3zm-1 9H3V4h10v8z"/>
                    <path d="M12 1H4v1h8V1zm0 13H4v1h8v-1z"/>
                </svg>
            </button>
            <button class="icon-button" id="settings-btn" title="?ㅼ젙">
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
        <!-- Context Items Section -->
        <div id="context-items-section">
            <div id="context-items-header">
                ?뱨 Code Context Items
                <button id="add-context-btn">+ ?뚯씪 異붽?</button>
            </div>
            <div id="context-items-list"></div>
        </div>

        <div id="messages-container">
            <div id="empty-state">
                <div style="font-size: 48px; margin-bottom: 16px;">?뮠</div>
                <div>AI?먭쾶 臾댁뾿?대뱺 臾쇱뼱蹂댁꽭??/div>
                <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">@ 瑜??낅젰?섏뿬 ?뚯씪??李몄“?????덉뒿?덈떎</div>
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
                <div id="autocomplete-dropdown"></div>
                <div id="image-preview-area" style="display: none; padding: 4px; gap: 4px; overflow-x: auto;"></div>
                <div style="display: flex; width: 100%; align-items: flex-end; gap: 8px;">
                    <button id="attach-btn" class="icon-button" title="?대?吏 泥⑤?">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.5 3h7a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3zm0 1a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-7z"/>
                            <path d="M5 8l2-2 2 2 2-2 2 2v3H5V8z"/>
                        </svg>
                    </button>
                    <textarea id="message-input" placeholder="硫붿떆吏瑜??낅젰?섏꽭??.. (@濡??뚯씪 李몄“, Ctrl+Enter濡??꾩넚)" rows="1"></textarea>
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
`;

// JavaScript 遺遺꾩? Part 3?먯꽌 怨꾩냽?⑸땲??
// Part 3: JavaScript
// ???댁슜? HTML??<script> ?쒓렇 ?덉뿉 ?ㅼ뼱媛묐땲??

const jsContent = `
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
        const contextItemsSection = document.getElementById('context-items-section');
        const contextItemsList = document.getElementById('context-items-list');
        const addContextBtn = document.getElementById('add-context-btn');
        const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

        // State
        let currentResponse = '';
        let selectedImages = [];
        let isGenerating = false;
        let contextItems = [];
        let autocompleteResults = [];
        let selectedAutocompleteIndex = -1;
        let isShowingAutocomplete = false;
        let lastAtPosition = -1;

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

        addContextBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'selectFileForContext' });
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

        // @ Autocomplete functionality
        messageInput.addEventListener('input', (e) => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
            updateSendButton();

            const text = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            
            // @ 臾몄옄 李얘린
            const textBeforeCursor = text.substring(0, cursorPos);
            const lastAtIndex = textBeforeCursor.lastIndexOf('@');
            
            if (lastAtIndex !== -1) {
                const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                
                // @  ??怨듬갚???녾퀬, 媛쒗뻾???놁쑝硫?寃??
                if (!textAfterAt.includes(' ') && !textAfterAt.includes('\\n')) {
                    lastAtPosition = lastAtIndex;
                    
                    // ?뚯씪 寃??
                    if (textAfterAt.length >= 0) {
                        vscode.postMessage({ type: 'searchFiles', query: textAfterAt });
                        isShowingAutocomplete = true;
                    }
                } else {
                    hideAutocomplete();
                }
            } else {
                hideAutocomplete();
            }
        });

        messageInput.addEventListener('keydown', (e) => {
            if (isShowingAutocomplete && autocompleteResults.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, autocompleteResults.length - 1);
                    updateAutocompleteSelection();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, 0);
                    updateAutocompleteSelection();
                } else if (e.key === 'Enter' && !e.ctrlKey) {
                    e.preventDefault();
                    if (selectedAutocompleteIndex >= 0) {
                        selectAutocompleteItem(autocompleteResults[selectedAutocompleteIndex]);
                    }
                    return;
                } else if (e.key === 'Escape') {
                    hideAutocomplete();
                }
            }

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

        function hideAutocomplete() {
            autocompleteDropdown.classList.remove('visible');
            isShowingAutocomplete = false;
            selectedAutocompleteIndex = -1;
            autocompleteResults = [];
        }

        function showAutocomplete(results) {
            autocompleteResults = results;
            autocompleteDropdown.innerHTML = '';
            
            if (results.length === 0) {
                hideAutocomplete();
                return;
            }

            results.forEach((result, index) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                if (index === selectedAutocompleteIndex) {
                    item.classList.add('selected');
                }
                
                item.innerHTML = \`
                    <span class="autocomplete-file-icon">?뱞</span>
                    <span class="autocomplete-file-name">\${result.name}</span>
                    <span class="autocomplete-file-path">\${result.path}</span>
                \`;
                
                item.addEventListener('click', () => selectAutocompleteItem(result));
                autocompleteDropdown.appendChild(item);
            });

            autocompleteDropdown.classList.add('visible');
            selectedAutocompleteIndex = 0;
            updateAutocompleteSelection();
        }

        function updateAutocompleteSelection() {
            const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
            items.forEach((item, index) => {
                if (index === selectedAutocompleteIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        function selectAutocompleteItem(result) {
            // @ ?댄썑???띿뒪?몃? ?뚯씪紐낆쑝濡?援먯껜
            const text = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const textBeforeCursor = text.substring(0, cursorPos);
            const textAfterCursor = text.substring(cursorPos);
            
            const lastAtIndex = textBeforeCursor.lastIndexOf('@');
            const newText = text.substring(0, lastAtIndex) + text.substring(cursorPos);
            
            messageInput.value = newText;
            
            // 而⑦뀓?ㅽ듃???뚯씪 異붽?
            const item = {
                type: 'file',
                name: result.name,
                path: result.path,
                uri: result.uri
            };
            vscode.postMessage({ type: 'addContextItem', item });
            
            hideAutocomplete();
            messageInput.focus();
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
                        <button class="remove-img-btn" style="position: absolute; top: -4px; right: -4px; background: red; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer;">횞</button>
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

        function renderContextItems(items) {
            contextItems = items;
            contextItemsList.innerHTML = '';
            
            if (items.length > 0) {
                contextItemsSection.classList.add('visible');
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'context-item';
                    div.innerHTML = \`
                        ?뱞 \${item.name}
                        <button class="context-item-remove">횞</button>
                    \`;
                    div.querySelector('.context-item-remove').onclick = () => {
                        vscode.postMessage({ type: 'removeContextItem', path: item.path });
                    };
                    contextItemsList.appendChild(div);
                });
            } else {
                contextItemsSection.classList.remove('visible');
            }
        }

        function updateLastMessage(text) {
            const lastMsg = messagesContainer.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('assistant-message')) {
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
                    <button class="delete-session-btn" title="??젣">횞</button>
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
                case 'contextItemsUpdate':
                    renderContextItems(msg.items);
                    break;
                case 'fileSearchResults':
                    showAutocomplete(msg.results);
                    break;
            }
        });
    </script>
</body>
</html>\`;
`;

// ?댁젣 ????part瑜??섎굹濡??⑹퀜???⑸땲??
