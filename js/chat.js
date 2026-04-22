// ===========================
// CHAT.JS — Full Advanced Chat
// ===========================

let conversations = [];
let currentConversationId = null;
let currentMessages = [];
let streamMode = false;
let isGenerating = false;
let abortController = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    updateModelStatus('loading', 'Loading models...');

    try {
        await initModels();
        const count = loadedModels.length;
        updateModelStatus('ready', `${count} models available`, count);
    } catch (err) {
        console.error('Model init error:', err);
        useFallback();
        renderModelDropdown();
        updateModelStatus('error', `Fallback: ${loadedModels.length} models`, loadedModels.length);
    }

    await loadConversations();
    if (conversations.length > 0) {
        await switchConversation(conversations[0].id);
    } else {
        newConversation(false);
    }
    updateStreamBadge();
});

// ==================== MODEL STATUS ====================
function updateModelStatus(state, text, count) {
    const dot = document.getElementById('model-status-dot');
    const label = document.getElementById('model-status-text');
    const badge = document.getElementById('model-count-badge');

    if (dot) {
        dot.className = 'model-status-dot';
        if (state === 'loading') dot.classList.add('loading');
        else if (state === 'error') dot.classList.add('error');
    }
    if (label) label.textContent = text || '';
    if (badge && count != null) badge.textContent = `${count} models`;
}

// ==================== CONVERSATIONS ====================
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
        messageCount: 0,
    };
    conversations.unshift(conv);
    currentConversationId = id;
    currentMessages = [];
    if (save) saveConversations();
    renderChatList();
    renderMessages();
    showWelcome(true);
    focusInput();
}

async function switchConversation(id) {
    if (currentConversationId && currentMessages.length > 0) {
        await saveCurrentMessages();
    }
    currentConversationId = id;
    currentMessages = await loadMessages(id);

    const conv = conversations.find(c => c.id === id);
    if (conv && conv.model) {
        selectModel(conv.model, conv.model);
    }

    renderChatList();
    renderMessages();
    showWelcome(currentMessages.length === 0);
    focusInput();

    // Close mobile sidebar
    const sidebar = document.getElementById('chat-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
}

async function deleteConversation(id, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    conversations = conversations.filter(c => c.id !== id);
    await saveConversations();
    try { await puter.kv.del(`puter_chat_${id}`); } catch {}

    if (currentConversationId === id) {
        if (conversations.length > 0) {
            await switchConversation(conversations[0].id);
        } else {
            newConversation();
        }
    }
    renderChatList();
    toast('Chat deleted', 'info');
}

async function renameConversation(id, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    showModal(`
        <h3 style="margin-bottom:14px;">✏️ Rename Chat</h3>
        <input type="text" class="input" id="rename-input" value="${escapeHtml(conv.title)}" placeholder="Chat title...">
        <div class="btn-group" style="margin-top:8px;">
            <button class="btn btn-primary" onclick="doRename('${id}')">Save</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
    setTimeout(() => {
        const inp = document.getElementById('rename-input');
        if (inp) { inp.focus(); inp.select(); }
    }, 100);
}

async function doRename(id) {
    const input = document.getElementById('rename-input');
    const title = input ? input.value.trim() : '';
    if (!title) return toast('Enter a title', 'error');
    const conv = conversations.find(c => c.id === id);
    if (conv) {
        conv.title = title;
        await saveConversations();
        renderChatList();
        toast('Renamed!', 'success');
    }
    closeModal();
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
                <span class="chat-meta-model">${escapeHtml(c.model || 'gpt-4o-mini')}</span>
                <span>${c.messageCount || 0} msgs · ${timeAgo(c.updated)}</span>
            </div>
            <button class="chat-delete" onclick="deleteConversation('${c.id}', event)" title="Delete">✕</button>
        </div>
    `).join('');
}

function filterChats() {
    const query = (document.getElementById('chat-search-input')?.value || '').toLowerCase();
    document.querySelectorAll('.chat-list-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

// ==================== MESSAGES ====================
function showWelcome(show) {
    const ws = document.getElementById('welcome-screen');
    if (ws) ws.style.display = show ? '' : 'none';
}

function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

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

    scrollToBottom();
}

function createMessageEl(msg, idx) {
    const role = msg.role === 'assistant' ? 'ai' : msg.role;
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.id = `msg-${idx}`;

    const isAI = role === 'ai' || role === 'assistant';
    const contentHtml = isAI ? mdToHtml(msg.content || '') : escapeHtml(msg.content || '');

    div.innerHTML = `
        <div class="message-avatar">${isAI ? '🤖' : '👤'}</div>
        <div class="message-body">
            <div class="message-content">${contentHtml}</div>
            ${msg.image ? `<img class="message-image" src="${msg.image}" onclick="window.open(this.src)" alt="Generated image">` : ''}
            <div class="message-actions">
                <button onclick="copyMessage(${idx})" title="Copy">📋 Copy</button>
                <button onclick="deleteMessage(${idx})" title="Delete">🗑️ Delete</button>
                ${msg.role === 'user' ? `<button onclick="editMessage(${idx})" title="Edit">✏️ Edit</button>` : ''}
                ${msg.role === 'user' ? `<button onclick="regenerateFrom(${idx})" title="Regenerate">🔄 Retry</button>` : ''}
                ${isAI ? `<button onclick="regenerateResponse(${idx})" title="Regenerate Response">🔄 Regen</button>` : ''}
            </div>
            <div class="message-time">${msg.time || ''} ${msg.model ? '· ' + msg.model : ''}</div>
        </div>
    `;
    return div;
}

function addMessage(role, content, extra = {}) {
    const msg = {
        role,
        content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: role === 'user' ? undefined : selectedModel,
        ...extra,
    };
    currentMessages.push(msg);

    const container = document.getElementById('chat-messages');
    showWelcome(false);
    container.appendChild(createMessageEl(msg, currentMessages.length - 1));
    scrollToBottom();
    return msg;
}

function updateLastAIMessage(content) {
    const idx = currentMessages.length - 1;
    if (idx < 0) return;
    currentMessages[idx].content = content;
    const el = document.getElementById(`msg-${idx}`);
    if (el) {
        const contentEl = el.querySelector('.message-content');
        if (contentEl) contentEl.innerHTML = mdToHtml(content);
    }
    scrollToBottom();
}

function addTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'typing-msg';
    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-body">
            <div class="message-content">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-msg');
    if (el) el.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

// ==================== SEND MESSAGE ====================
async function sendMessage() {
    if (isGenerating) return;

    const input = document.getElementById('chat-input');
    const text = (input.value || '').trim();
    if (!text) return;

    input.value = '';
    autoResize(input);
    updateCharCount();

    addMessage('user', text);
    updateConvMeta(text);

    isGenerating = true;
    toggleButtons(true);
    addTypingIndicator();

    try {
        const systemPrompt = document.getElementById('system-prompt')?.value?.trim();
        const messages = buildMessagePayload(systemPrompt);

        if (streamMode) {
            removeTypingIndicator();
            addMessage('assistant', '');
            let fullContent = '';

            const response = await puter.ai.chat(messages, {
                model: selectedModel,
                stream: true,
            });

            for await (const part of response) {
                if (!isGenerating) break; // stopped
                const chunk = part?.text || part?.message?.content || '';
                if (chunk) {
                    fullContent += chunk;
                    updateLastAIMessage(fullContent);
                }
            }

            currentMessages[currentMessages.length - 1].content = fullContent;
            currentMessages[currentMessages.length - 1].model = selectedModel;
        } else {
            const response = await puter.ai.chat(messages, { model: selectedModel });
            removeTypingIndicator();
            const reply = response?.message?.content || response?.text || String(response);
            addMessage('assistant', reply);
        }

        await saveCurrentMessages();
        updateConvMeta();

    } catch (e) {
        removeTypingIndicator();
        if (e.name !== 'AbortError') {
            addMessage('assistant', `❌ Error: ${e.message}`);
            toast('AI Error: ' + e.message, 'error');
        }
    }

    isGenerating = false;
    toggleButtons(false);
}

function buildMessagePayload(systemPrompt) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

    currentMessages.forEach(m => {
        const role = (m.role === 'ai') ? 'assistant' : m.role;
        if (role === 'user' || role === 'assistant') {
            messages.push({ role, content: m.content });
        }
    });

    return messages;
}

function stopGeneration() {
    isGenerating = false;
    removeTypingIndicator();
    toggleButtons(false);
    toast('Generation stopped', 'info');
}

// ==================== MESSAGE ACTIONS ====================
function copyMessage(idx) {
    const msg = currentMessages[idx];
    if (msg) {
        navigator.clipboard.writeText(msg.content).then(() => {
            toast('Copied!', 'success');
        });
    }
}

async function deleteMessage(idx) {
    currentMessages.splice(idx, 1);
    renderMessages();
    await saveCurrentMessages();
    updateConvMeta();
    toast('Message deleted', 'info');
}

function editMessage(idx) {
    const msg = currentMessages[idx];
    if (!msg) return;

    showModal(`
        <h3 style="margin-bottom:14px;">✏️ Edit Message</h3>
        <textarea class="input" id="edit-msg-input" rows="5" style="min-height:120px;">${escapeHtml(msg.content)}</textarea>
        <div class="btn-group" style="margin-top:8px;">
            <button class="btn btn-primary" onclick="doEditMessage(${idx})">Save & Resend</button>
            <button class="btn btn-secondary" onclick="doEditMessageOnly(${idx})">Save Only</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function doEditMessage(idx) {
    const input = document.getElementById('edit-msg-input');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    // Remove all messages from this point onward
    currentMessages = currentMessages.slice(0, idx);
    closeModal();
    renderMessages();

    // Send as new message
    document.getElementById('chat-input').value = text;
    await sendMessage();
}

async function doEditMessageOnly(idx) {
    const input = document.getElementById('edit-msg-input');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    currentMessages[idx].content = text;
    closeModal();
    renderMessages();
    await saveCurrentMessages();
    toast('Message updated', 'success');
}

async function regenerateFrom(idx) {
    const userMsg = currentMessages[idx];
    if (!userMsg || userMsg.role !== 'user') return;

    currentMessages = currentMessages.slice(0, idx);
    renderMessages();

    document.getElementById('chat-input').value = userMsg.content;
    await sendMessage();
}

async function regenerateResponse(idx) {
    if (idx < 1) return;
    // Find the user message before this AI response
    let userIdx = idx - 1;
    while (userIdx >= 0 && currentMessages[userIdx].role !== 'user') userIdx--;
    if (userIdx < 0) return;

    const userMsg = currentMessages[userIdx];
    currentMessages = currentMessages.slice(0, idx);
    renderMessages();

    document.getElementById('chat-input').value = userMsg.content;
    await sendMessage();
}

// ==================== CONVERSATION META ====================
function updateConvMeta(userText) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;

    conv.updated = new Date().toISOString();
    conv.model = selectedModel;
    conv.messageCount = currentMessages.length;

    if (userText && conv.title === 'New Chat') {
        conv.title = userText.substring(0, 60) + (userText.length > 60 ? '...' : '');
    }

    if (currentMessages.length > 0) {
        const last = currentMessages[currentMessages.length - 1];
        conv.preview = (last.content || '').substring(0, 80);
    }

    saveConversations();
    renderChatList();
}

// ==================== STREAM MODE ====================
function toggleStreamMode() {
    streamMode = !streamMode;
    const indicator = document.getElementById('stream-indicator');
    if (indicator) indicator.textContent = streamMode ? '📡' : '⏸️';
    updateStreamBadge();
    toast(`Stream: ${streamMode ? 'ON' : 'OFF'}`, 'info');
}

function updateStreamBadge() {
    const badge = document.getElementById('stream-badge');
    if (badge) {
        badge.textContent = `Stream: ${streamMode ? 'ON' : 'OFF'}`;
        badge.className = `stream-badge ${streamMode ? 'on' : ''}`;
    }
}

// ==================== SYSTEM PROMPT ====================
function toggleSystemPrompt() {
    const bar = document.getElementById('system-prompt-bar');
    if (bar) {
        const visible = bar.style.display !== 'none';
        bar.style.display = visible ? 'none' : 'flex';
        if (!visible) {
            const ta = document.getElementById('system-prompt');
            if (ta) ta.focus();
        }
    }
}

function clearSystemPrompt() {
    const ta = document.getElementById('system-prompt');
    if (ta) ta.value = '';
    toast('System prompt cleared', 'info');
}

// ==================== CHAT SIDEBAR TOGGLE ====================
function toggleChatSidebar() {
    const sidebar = document.getElementById('chat-sidebar');
    if (!sidebar) return;

    if (window.innerWidth <= 900) {
        sidebar.classList.toggle('mobile-open');
        sidebar.classList.remove('hidden');
    } else {
        sidebar.classList.toggle('hidden');
    }
}

// ==================== EXPORT / IMPORT ====================
function exportCurrentChat() {
    if (currentMessages.length === 0) return toast('Nothing to export', 'error');
    const conv = conversations.find(c => c.id === currentConversationId);
    const data = {
        id: currentConversationId,
        title: conv?.title || 'Chat',
        model: selectedModel,
        messages: currentMessages,
        exported: new Date().toISOString(),
        version: 2,
    };
    downloadText(JSON.stringify(data, null, 2), `chat-${currentConversationId}.json`, 'application/json');
    toast('Chat exported as JSON', 'success');
}

function downloadChatMD() {
    if (currentMessages.length === 0) return toast('Nothing to export', 'error');
    const conv = conversations.find(c => c.id === currentConversationId);
    let md = `# ${conv?.title || 'Chat'}\n\n`;
    md += `**Model:** ${selectedModel}  \n`;
    md += `**Date:** ${new Date().toLocaleString()}  \n`;
    md += `**Messages:** ${currentMessages.length}  \n\n---\n\n`;

    currentMessages.forEach(m => {
        const role = m.role === 'user' ? '👤 **You**' : '🤖 **AI**';
        md += `### ${role}`;
        if (m.model) md += ` *(${m.model})*`;
        if (m.time) md += ` — ${m.time}`;
        md += `\n\n${m.content}\n\n---\n\n`;
    });

    downloadText(md, `chat-${currentConversationId}.md`);
    toast('Chat exported as Markdown', 'success');
}

async function saveToCloud() {
    if (currentMessages.length === 0) return toast('Nothing to save', 'error');
    const conv = conversations.find(c => c.id === currentConversationId);
    const filename = `chats/chat-${currentConversationId}.json`;
    const data = {
        id: currentConversationId,
        title: conv?.title || 'Chat',
        model: selectedModel,
        messages: currentMessages,
        saved: new Date().toISOString(),
    };
    try {
        await puter.fs.write(filename, JSON.stringify(data, null, 2), { overwrite: true, createMissingParents: true });
        toast('Saved to cloud: ' + filename, 'success');
    } catch (e) {
        toast('Save error: ' + e.message, 'error');
    }
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
            throw new Error('Invalid chat file: missing messages array');
        }

        const id = uid();
        const conv = {
            id,
            title: data.title || 'Imported Chat',
            model: data.model || 'gpt-4o-mini',
            created: data.exported || data.saved || new Date().toISOString(),
            updated: new Date().toISOString(),
            preview: data.messages.length > 0
                ? data.messages[data.messages.length - 1].content?.substring(0, 80)
                : '',
            messageCount: data.messages.length,
        };

        conversations.unshift(conv);
        await saveConversations();
        await puter.kv.set(`puter_chat_${id}`, JSON.stringify(data.messages));
        await switchConversation(id);
        toast(`Imported: ${data.messages.length} messages`, 'success');
    } catch (e) {
        toast('Import error: ' + e.message, 'error');
    }
    event.target.value = '';
}

// ==================== IMAGE GENERATION ====================
async function generateImage() {
    const input = document.getElementById('chat-input');
    const prompt = (input.value || '').trim();
    if (!prompt) return toast('Enter an image prompt', 'error');

    input.value = '';
    autoResize(input);

    addMessage('user', `🎨 Generate image: ${prompt}`);
    updateConvMeta(prompt);
    isGenerating = true;
    toggleButtons(true);
    addTypingIndicator();

    try {
        const image = await puter.ai.txt2img(prompt);
        removeTypingIndicator();

        if (image && image.src) {
            addMessage('assistant', `Image generated for: "${prompt}"`, { image: image.src });
        } else {
            addMessage('assistant', '❌ Image generation returned no result.');
        }

        await saveCurrentMessages();
        updateConvMeta();
    } catch (e) {
        removeTypingIndicator();
        addMessage('assistant', `❌ Image error: ${e.message}`);
        toast('Image error: ' + e.message, 'error');
    }

    isGenerating = false;
    toggleButtons(false);
}

// ==================== CLEAR ====================
function clearChat() {
    if (currentMessages.length === 0) return;

    showModal(`
        <h3 style="margin-bottom:14px;">🗑️ Clear Chat?</h3>
        <p class="text-muted" style="margin-bottom:20px;">This will delete all messages in this conversation. This cannot be undone.</p>
        <div class="btn-group">
            <button class="btn btn-danger" onclick="doClearChat()">🗑️ Clear</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function doClearChat() {
    closeModal();
    currentMessages = [];
    renderMessages();
    showWelcome(true);
    await saveCurrentMessages();

    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) {
        conv.preview = '';
        conv.title = 'New Chat';
        conv.messageCount = 0;
    }
    await saveConversations();
    renderChatList();
    toast('Chat cleared', 'info');
}

// ==================== SUGGESTIONS ====================
function useSuggestion(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

// ==================== UI HELPERS ====================
function handleChatKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    updateCharCount();
}

function updateCharCount() {
    const input = document.getElementById('chat-input');
    const counter = document.getElementById('char-count');
    if (counter && input) counter.textContent = (input.value || '').length + ' chars';
}

function focusInput() {
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
}

function toggleButtons(generating) {
    const sendBtn = document.getElementById('send-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (sendBtn) sendBtn.style.display = generating ? 'none' : 'flex';
    if (stopBtn) stopBtn.style.display = generating ? 'flex' : 'none';
}

// ==================== HELPERS ====================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (isNaN(diff)) return '';
    if (diff < 10) return 'Just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return then.toLocaleDateString();
}