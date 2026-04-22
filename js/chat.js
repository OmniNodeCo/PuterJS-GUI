// ===========================
// CHAT.JS — Advanced AI Chat
// ===========================

let conversations = [];
let currentConversationId = null;
let currentMessages = [];
let streamMode = false;
let isGenerating = false;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
    renderModelDropdown();
    await loadConversations();
    newConversation(false);
});

// ---- CONVERSATIONS MANAGEMENT ----
async function loadConversations() {
    try {
        const raw = await puter.kv.get('puter_chat_list');
        conversations = raw ? JSON.parse(raw) : [];
    } catch {
        conversations = [];
    }
    renderChatList();
}

async function saveConversations() {
    try {
        await puter.kv.set('puter_chat_list', JSON.stringify(conversations));
    } catch (e) {
        console.error('Save conversations error:', e);
    }
}

async function saveCurrentMessages() {
    if (!currentConversationId) return;
    try {
        await puter.kv.set(`puter_chat_${currentConversationId}`, JSON.stringify(currentMessages));
    } catch (e) {
        console.error('Save messages error:', e);
    }
}

async function loadMessages(convId) {
    try {
        const raw = await puter.kv.get(`puter_chat_${convId}`);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function newConversation(save = true) {
    const id = uid();
    const conv = {
        id,
        title: 'New Chat',
        model: selectedModel,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        preview: '',
    };
    conversations.unshift(conv);
    currentConversationId = id;
    currentMessages = [];
    if (save) saveConversations();
    renderChatList();
    renderMessages();
    showWelcome(true);
}

async function switchConversation(id) {
    // Save current first
    await saveCurrentMessages();
    currentConversationId = id;
    currentMessages = await loadMessages(id);
    // Set model from conversation
    const conv = conversations.find(c => c.id === id);
    if (conv && conv.model) selectModel(conv.model);
    renderChatList();
    renderMessages();
    showWelcome(currentMessages.length === 0);
}

async function deleteConversation(id, e) {
    if (e) e.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    await saveConversations();
    try { await puter.kv.del(`puter_chat_${id}`); } catch {}
    if (currentConversationId === id) {
        if (conversations.length > 0) {
            switchConversation(conversations[0].id);
        } else {
            newConversation();
        }
    }
    renderChatList();
    toast('Chat deleted', 'info');
}

function renderChatList() {
    const list = document.getElementById('chat-list');
    if (!list) return;

    if (conversations.length === 0) {
        list.innerHTML = '<div class="chat-list-empty">No conversations yet.<br>Click "+ New" to start.</div>';
        return;
    }

    list.innerHTML = conversations.map(c => `
        <div class="chat-list-item ${c.id === currentConversationId ? 'active' : ''}" 
             onclick="switchConversation('${c.id}')">
            <div class="chat-title">${escapeHtml(c.title)}</div>
            <div class="chat-preview">${escapeHtml(c.preview || 'Empty conversation')}</div>
            <div class="chat-meta">
                <span>${c.model || 'gpt-4o'}</span>
                <span>${timeAgo(c.updated)}</span>
            </div>
            <button class="chat-delete" onclick="deleteConversation('${c.id}', event)" title="Delete">✕</button>
        </div>
    `).join('');
}

function filterChats() {
    const query = document.getElementById('chat-search-input').value.toLowerCase();
    const items = document.querySelectorAll('.chat-list-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
}

// ---- MESSAGES ----
function showWelcome(show) {
    const ws = document.getElementById('welcome-screen');
    if (ws) ws.style.display = show ? '' : 'none';
}

function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Keep welcome screen, remove messages
    const welcome = document.getElementById('welcome-screen');
    container.innerHTML = '';
    if (welcome) container.appendChild(welcome);

    if (currentMessages.length === 0) {
        showWelcome(true);
        return;
    }
    showWelcome(false);

    currentMessages.forEach((msg, idx) => {
        container.appendChild(createMessageEl(msg, idx));
    });

    container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg, idx) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    div.innerHTML = `
        <div class="message-avatar">${msg.role === 'user' ? '👤' : '🤖'}</div>
        <div>
            <div class="message-content">${msg.role === 'ai' || msg.role === 'assistant' ? mdToHtml(msg.content) : escapeHtml(msg.content)}</div>
            <div class="message-actions">
                <button onclick="copyMessage(${idx})" title="Copy">📋 Copy</button>
                <button onclick="deleteMessage(${idx})" title="Delete">🗑️</button>
                ${msg.role === 'user' ? `<button onclick="regenerateFrom(${idx})" title="Regenerate">🔄</button>` : ''}
            </div>
            <div class="message-time">${msg.time || ''}</div>
        </div>
    `;
    return div;
}

function addMessage(role, content) {
    const msg = {
        role,
        content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    currentMessages.push(msg);

    const container = document.getElementById('chat-messages');
    showWelcome(false);
    container.appendChild(createMessageEl(msg, currentMessages.length - 1));
    container.scrollTop = container.scrollHeight;
    return msg;
}

function addTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'typing-msg';
    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div>
            <div class="message-content">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-msg');
    if (el) el.remove();
}

// ---- SEND MESSAGE ----
async function sendMessage() {
    if (isGenerating) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    autoResize(input);
    updateCharCount();

    addMessage('user', text);

    // Update conversation metadata
    updateConvMeta(text);

    isGenerating = true;
    toggleSendButton(true);
    addTypingIndicator();

    try {
        const systemPrompt = document.getElementById('system-prompt')?.value.trim();
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        currentMessages.forEach(m => {
            const role = m.role === 'ai' ? 'assistant' : m.role;
            if (role === 'user' || role === 'assistant') {
                messages.push({ role, content: m.content });
            }
        });

        if (streamMode) {
            removeTypingIndicator();
            const streamMsg = addMessage('ai', '');
            const streamEl = document.getElementById('chat-messages').lastElementChild
                .querySelector('.message-content');

            let fullContent = '';
            const response = await puter.ai.chat(messages, {
                model: selectedModel,
                stream: true,
            });

            for await (const part of response) {
                const chunk = part?.text || part?.message?.content || '';
                if (chunk) {
                    fullContent += chunk;
                    streamEl.innerHTML = mdToHtml(fullContent);
                    document.getElementById('chat-messages').scrollTop = 
                        document.getElementById('chat-messages').scrollHeight;
                }
            }
            currentMessages[currentMessages.length - 1].content = fullContent;
        } else {
            const response = await puter.ai.chat(messages, { model: selectedModel });
            removeTypingIndicator();
            const reply = response?.message?.content || String(response);
            addMessage('ai', reply);
        }

        await saveCurrentMessages();
        updateConvMeta();
    } catch (e) {
        removeTypingIndicator();
        addMessage('ai', `❌ Error: ${e.message}`);
        toast('AI Error: ' + e.message, 'error');
    }

    isGenerating = false;
    toggleSendButton(false);
}

function updateConvMeta(userText) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    conv.updated = new Date().toISOString();
    conv.model = selectedModel;
    if (userText && conv.title === 'New Chat') {
        conv.title = userText.substring(0, 50) + (userText.length > 50 ? '...' : '');
    }
    if (currentMessages.length > 0) {
        const last = currentMessages[currentMessages.length - 1];
        conv.preview = last.content.substring(0, 60);
    }
    saveConversations();
    renderChatList();
}

// ---- ACTIONS ----
function copyMessage(idx) {
    const msg = currentMessages[idx];
    if (msg) {
        navigator.clipboard.writeText(msg.content);
        toast('Copied!', 'success');
    }
}

async function deleteMessage(idx) {
    currentMessages.splice(idx, 1);
    renderMessages();
    await saveCurrentMessages();
    toast('Message deleted', 'info');
}

async function regenerateFrom(idx) {
    // Remove everything after this user message
    currentMessages = currentMessages.slice(0, idx + 1);
    renderMessages();

    // Re-send
    const lastUser = currentMessages[idx];
    currentMessages.pop(); // Remove it, sendMessage will re-add
    document.getElementById('chat-input').value = lastUser.content;
    await sendMessage();
}

function clearChat() {
    currentMessages = [];
    renderMessages();
    showWelcome(true);
    saveCurrentMessages();
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) { conv.preview = ''; conv.title = 'New Chat'; }
    saveConversations();
    renderChatList();
    toast('Chat cleared', 'info');
}

function useSuggestion(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

// ---- EXPORT / IMPORT ----
function exportCurrentChat() {
    if (currentMessages.length === 0) return toast('Nothing to export', 'error');
    const conv = conversations.find(c => c.id === currentConversationId);
    const data = {
        id: currentConversationId,
        title: conv?.title || 'Chat',
        model: selectedModel,
        messages: currentMessages,
        exported: new Date().toISOString(),
    };
    downloadText(JSON.stringify(data, null, 2), `chat-${currentConversationId}.json`, 'application/json');
    toast('Chat exported as JSON', 'success');
}

function downloadChatMD() {
    if (currentMessages.length === 0) return toast('Nothing to export', 'error');
    const conv = conversations.find(c => c.id === currentConversationId);
    let md = `# ${conv?.title || 'Chat'}\n\n`;
    md += `**Model:** ${selectedModel}  \n`;
    md += `**Date:** ${new Date().toLocaleString()}  \n\n---\n\n`;
    currentMessages.forEach(m => {
        const role = m.role === 'user' ? '👤 **You**' : '🤖 **AI**';
        md += `### ${role}\n\n${m.content}\n\n---\n\n`;
    });
    downloadText(md, `chat-${currentConversationId}.md`);
    toast('Chat exported as Markdown', 'success');
}

function importChat() {
    document.getElementById('import-file').click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.messages || !Array.isArray(data.messages)) {
            throw new Error('Invalid chat file format');
        }

        const id = uid();
        const conv = {
            id,
            title: data.title || 'Imported Chat',
            model: data.model || 'gpt-4o',
            created: data.exported || new Date().toISOString(),
            updated: new Date().toISOString(),
            preview: data.messages[data.messages.length - 1]?.content?.substring(0, 60) || '',
        };
        conversations.unshift(conv);
        await saveConversations();
        await puter.kv.set(`puter_chat_${id}`, JSON.stringify(data.messages));
        await switchConversation(id);
        toast('Chat imported!', 'success');
    } catch (e) {
        toast('Import error: ' + e.message, 'error');
    }
    event.target.value = '';
}

// ---- STREAM MODE ----
function toggleStreamMode() {
    streamMode = !streamMode;
    const indicator = document.getElementById('stream-indicator');
    if (indicator) indicator.textContent = streamMode ? '📡' : '⏸️';
    toast(`Stream mode: ${streamMode ? 'ON' : 'OFF'}`, 'info');
}

// ---- SYSTEM PROMPT ----
function toggleSystemPrompt() {
    const bar = document.getElementById('system-prompt-bar');
    if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

// ---- UI HELPERS ----
function handleChatKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    updateCharCount();
}

function updateCharCount() {
    const input = document.getElementById('chat-input');
    const counter = document.getElementById('char-count');
    if (counter && input) counter.textContent = input.value.length + ' chars';
}

function toggleSendButton(loading) {
    const btn = document.getElementById('send-btn');
    if (btn) {
        btn.disabled = loading;
        btn.innerHTML = loading
            ? '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></div>'
            : '<span class="send-icon">➤</span>';
    }
}

function attachImage() {
    toast('Image attachment coming soon!', 'info');
}

// ---- HELPERS ----
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function timeAgo(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return then.toLocaleDateString();
}