// ===========================
// CHAT.JS — Full with Loader Integration
// ===========================

let conversations = [];
let currentConversationId = null;
let currentMessages = [];
let streamMode = false;
let isGenerating = false;
let pageLoader = null;
let modelProgress = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {

    // Create page loader
    pageLoader = new PageLoader({
        steps: [
            { label: 'Connecting to Puter...' },
            { label: 'Loading AI models...' },
            { label: 'Scanning providers...' },
            { label: 'Loading conversations...' },
            { label: 'Preparing interface...' },
        ],
        autoHideDelay: 400,
    });

    // Step 1: Connect
    pageLoader.startStep(0, 'Connecting to Puter...');
    pageLoader.setProgress(5);
    await sleep(300);
    pageLoader.completeStep(0, '✓ Connected');

    // Step 2: Load models
    pageLoader.startStep(1, 'Loading AI models...');
    pageLoader.setProgress(10);

    // Create inline progress bar under model status
    modelProgress = new InlineProgress('model-load-progress', {
        height: '4px',
        showLabel: true,
    });

    updateModelStatus('loading', 'Loading models...');

    // Hook model loading progress
    modelLoadCallback = (ev) => {
        if (modelProgress) modelProgress.update(ev.pct, ev.detail);
        pageLoader.setProgress(10 + (ev.pct * 0.6)); // 10-70% range

        // Update step 2 (providers) during per-provider scan
        if (ev.step === 'per-provider-start') {
            pageLoader.completeStep(1, 'Scanning...');
            pageLoader.startStep(2, 'Scanning providers...');
        }
        if (ev.step === 'per-provider-hit') {
            pageLoader.setStatus(ev.detail);
        }
    };

    try {
        await initModels();
        const count = loadedModels.length;
        const providers = Object.keys(modelsByProvider).length;

        updateModelStatus('ready', `${count} models · ${providers} providers`, count);
        pageLoader.completeStep(1, `${count} models`);
        pageLoader.completeStep(2, `${providers} providers`);

    } catch (err) {
        console.error('Model init error:', err);
        useFallback();
        renderModelDropdown();
        updateModelStatus('error', `Fallback: ${loadedModels.length} models`, loadedModels.length);
        pageLoader.completeStep(1, 'Fallback', true);
        pageLoader.completeStep(2, 'Static list', true);
    }

    // Remove inline progress after load
    setTimeout(() => {
        if (modelProgress) modelProgress.remove();
        modelProgress = null;
    }, 800);

    // Step 3: Load conversations
    pageLoader.startStep(3, 'Loading conversations...');
    pageLoader.setProgress(75);
    await loadConversations();
    pageLoader.completeStep(3, `${conversations.length} chats`);

    // Step 4: Prepare UI
    pageLoader.startStep(4, 'Preparing interface...');
    pageLoader.setProgress(90);

    if (conversations.length > 0) {
        await switchConversation(conversations[0].id);
    } else {
        newConversation(false);
    }
    updateStreamBadge();
    pageLoader.completeStep(4, '✓ Ready');

    // Hide loader
    await pageLoader.hide();
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    if (conv && conv.model) selectModel(conv.model, conv.model);

    renderChatList();
    renderMessages();
    showWelcome(currentMessages.length === 0);
    focusInput();

    const sidebar = document.getElementById('chat-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
}

async function deleteConversation(id, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    conversations = conversations.filter(c => c.id !== id);
    await saveConversations();
    try { await puter.kv.del(`puter_chat_${id}`); } catch {}

    if (currentConversationId === id) {
        if (conversations.length > 0) await switchConversation(conversations[0].id);
        else newConversation();
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
                <span class="chat-meta-model">${escapeHtml(c.model || 'gpt-4o-mini')}</span>
                <span>${c.messageCount || 0} msgs · ${timeAgo(c.updated)}</span>
            </div>
            <button class="chat-delete" onclick="deleteConversation('${c.id}', event)" title="Delete">✕</button>
        </div>
    `).join('');
}

function filterChats() {
    const q = (document.getElementById('chat-search-input')?.value || '').toLowerCase();
    document.querySelectorAll('.chat-list-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
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
    if (currentMessages.length === 0) { showWelcome(true); return; }
    showWelcome(false);
    currentMessages.forEach((msg, idx) => container.appendChild(createMessageEl(msg, idx)));
    scrollToBottom();
}

function createMessageEl(msg, idx) {
    const role = msg.role === 'assistant' ? 'ai' : msg.role;
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.id = `msg-${idx}`;
    const isAI = role === 'ai' || role === 'assistant';
    const html = isAI ? mdToHtml(msg.content || '') : escapeHtml(msg.content || '');

    div.innerHTML = `
        <div class="message-avatar">${isAI ? '🤖' : '👤'}</div>
        <div class="message-body">
            <div class="message-content">${html}</div>
            ${msg.image ? `<img class="message-image" src="${msg.image}" onclick="window.open(this.src)" alt="Generated image">` : ''}
            <div class="message-actions">
                <button onclick="copyMessage(${idx})">📋 Copy</button>
                <button onclick="deleteMessage(${idx})">🗑️ Delete</button>
                ${msg.role === 'user' ? `<button onclick="editMessage(${idx})">✏️ Edit</button>` : ''}
                ${msg.role === 'user' ? `<button onclick="regenerateFrom(${idx})">🔄 Retry</button>` : ''}
                ${isAI ? `<button onclick="regenerateResponse(${idx})">🔄 Regen</button>` : ''}
            </div>
            <div class="message-time">${msg.time || ''}${msg.model ? ' · ' + msg.model : ''}</div>
        </div>
    `;
    return div;
}

function addMessage(role, content, extra = {}) {
    const msg = {
        role, content,
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
        const c = el.querySelector('.message-content');
        if (c) c.innerHTML = mdToHtml(content);
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
    const c = document.getElementById('chat-messages');
    if (c) requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}

// ==================== SEND ====================
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
        const sys = document.getElementById('system-prompt')?.value?.trim();
        const messages = buildPayload(sys);

        if (streamMode) {
            removeTypingIndicator();
            addMessage('assistant', '');
            let full = '';
            const resp = await puter.ai.chat(messages, { model: selectedModel, stream: true });
            for await (const part of resp) {
                if (!isGenerating) break;
                const chunk = part?.text || part?.message?.content || '';
                if (chunk) { full += chunk; updateLastAIMessage(full); }
            }
            currentMessages[currentMessages.length - 1].content = full;
            currentMessages[currentMessages.length - 1].model = selectedModel;
        } else {
            const resp = await puter.ai.chat(messages, { model: selectedModel });
            removeTypingIndicator();
            const reply = resp?.message?.content || resp?.text || String(resp);
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

function buildPayload(sys) {
    const msgs = [];
    if (sys) msgs.push({ role: 'system', content: sys });
    currentMessages.forEach(m => {
        const role = m.role === 'ai' ? 'assistant' : m.role;
        if (role === 'user' || role === 'assistant') msgs.push({ role, content: m.content });
    });
    return msgs;
}

function stopGeneration() {
    isGenerating = false;
    removeTypingIndicator();
    toggleButtons(false);
    toast('Stopped', 'info');
}

// ==================== MESSAGE ACTIONS ====================
function copyMessage(idx) {
    const m = currentMessages[idx];
    if (m) navigator.clipboard.writeText(m.content).then(() => toast('Copied!', 'success'));
}

async function deleteMessage(idx) {
    currentMessages.splice(idx, 1);
    renderMessages();
    await saveCurrentMessages();
    updateConvMeta();
    toast('Deleted', 'info');
}

function editMessage(idx) {
    const m = currentMessages[idx];
    if (!m) return;
    showModal(`
        <h3 style="margin-bottom:14px;">✏️ Edit Message</h3>
        <textarea class="input" id="edit-msg" rows="5" style="min-height:120px;">${escapeHtml(m.content)}</textarea>
        <div class="btn-group" style="margin-top:8px;">
            <button class="btn btn-primary" onclick="doEditResend(${idx})">Save & Resend</button>
            <button class="btn btn-secondary" onclick="doEditOnly(${idx})">Save Only</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function doEditResend(idx) {
    const t = document.getElementById('edit-msg')?.value?.trim();
    if (!t) return;
    currentMessages = currentMessages.slice(0, idx);
    closeModal();
    renderMessages();
    document.getElementById('chat-input').value = t;
    await sendMessage();
}

async function doEditOnly(idx) {
    const t = document.getElementById('edit-msg')?.value?.trim();
    if (!t) return;
    currentMessages[idx].content = t;
    closeModal();
    renderMessages();
    await saveCurrentMessages();
    toast('Updated', 'success');
}

async function regenerateFrom(idx) {
    const m = currentMessages[idx];
    if (!m || m.role !== 'user') return;
    currentMessages = currentMessages.slice(0, idx);
    renderMessages();
    document.getElementById('chat-input').value = m.content;
    await sendMessage();
}

async function regenerateResponse(idx) {
    let ui = idx - 1;
    while (ui >= 0 && currentMessages[ui].role !== 'user') ui--;
    if (ui < 0) return;
    const m = currentMessages[ui];
    currentMessages = currentMessages.slice(0, idx);
    renderMessages();
    document.getElementById('chat-input').value = m.content;
    await sendMessage();
}

// ==================== CONV META ====================
function updateConvMeta(userText) {
    const c = conversations.find(x => x.id === currentConversationId);
    if (!c) return;
    c.updated = new Date().toISOString();
    c.model = selectedModel;
    c.messageCount = currentMessages.length;
    if (userText && c.title === 'New Chat')
        c.title = userText.substring(0, 60) + (userText.length > 60 ? '...' : '');
    if (currentMessages.length > 0)
        c.preview = (currentMessages[currentMessages.length - 1].content || '').substring(0, 80);
    saveConversations();
    renderChatList();
}

// ==================== STREAM ====================
function toggleStreamMode() {
    streamMode = !streamMode;
    const ind = document.getElementById('stream-indicator');
    if (ind) ind.textContent = streamMode ? '📡' : '⏸️';
    updateStreamBadge();
    toast(`Stream: ${streamMode ? 'ON' : 'OFF'}`, 'info');
}

function updateStreamBadge() {
    const b = document.getElementById('stream-badge');
    if (b) { b.textContent = `Stream: ${streamMode ? 'ON' : 'OFF'}`; b.className = `stream-badge ${streamMode ? 'on' : ''}`; }
}

// ==================== SYSTEM PROMPT ====================
function toggleSystemPrompt() {
    const bar = document.getElementById('system-prompt-bar');
    if (bar) {
        const v = bar.style.display !== 'none';
        bar.style.display = v ? 'none' : 'flex';
        if (!v) document.getElementById('system-prompt')?.focus();
    }
}
function clearSystemPrompt() {
    const ta = document.getElementById('system-prompt');
    if (ta) ta.value = '';
    toast('Cleared', 'info');
}

// ==================== SIDEBAR TOGGLE ====================
function toggleChatSidebar() {
    const s = document.getElementById('chat-sidebar');
    if (!s) return;
    if (window.innerWidth <= 900) {
        s.classList.toggle('mobile-open');
        s.classList.remove('hidden');
    } else {
        s.classList.toggle('hidden');
    }
}

// ==================== EXPORT / IMPORT ====================
function exportCurrentChat() {
    if (!currentMessages.length) return toast('Nothing to export', 'error');
    const c = conversations.find(x => x.id === currentConversationId);
    downloadText(JSON.stringify({
        id: currentConversationId, title: c?.title || 'Chat', model: selectedModel,
        messages: currentMessages, exported: new Date().toISOString(), version: 2,
    }, null, 2), `chat-${currentConversationId}.json`, 'application/json');
    toast('Exported JSON', 'success');
}

function downloadChatMD() {
    if (!currentMessages.length) return toast('Nothing to export', 'error');
    const c = conversations.find(x => x.id === currentConversationId);
    let md = `# ${c?.title || 'Chat'}\n\n**Model:** ${selectedModel}  \n**Date:** ${new Date().toLocaleString()}\n**Messages:** ${currentMessages.length}\n\n---\n\n`;
    currentMessages.forEach(m => {
        const r = m.role === 'user' ? '👤 **You**' : '🤖 **AI**';
        md += `### ${r}${m.model ? ` *(${m.model})*` : ''}${m.time ? ` — ${m.time}` : ''}\n\n${m.content}\n\n---\n\n`;
    });
    downloadText(md, `chat-${currentConversationId}.md`);
    toast('Exported Markdown', 'success');
}

async function saveToCloud() {
    if (!currentMessages.length) return toast('Nothing to save', 'error');
    const c = conversations.find(x => x.id === currentConversationId);
    const fn = `chats/chat-${currentConversationId}.json`;
    try {
        await puter.fs.write(fn, JSON.stringify({
            id: currentConversationId, title: c?.title, model: selectedModel,
            messages: currentMessages, saved: new Date().toISOString(),
        }, null, 2), { overwrite: true, createMissingParents: true });
        toast('Saved: ' + fn, 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function importChat() { document.getElementById('import-file').click(); }

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        if (!data.messages || !Array.isArray(data.messages)) throw new Error('Invalid chat file');
        const id = uid();
        conversations.unshift({
            id, title: data.title || 'Imported', model: data.model || 'gpt-4o-mini',
            created: data.exported || new Date().toISOString(), updated: new Date().toISOString(),
            preview: data.messages.length ? data.messages[data.messages.length - 1].content?.substring(0, 80) : '',
            messageCount: data.messages.length,
        });
        await saveConversations();
        await puter.kv.set(`puter_chat_${id}`, JSON.stringify(data.messages));
        await switchConversation(id);
        toast(`Imported ${data.messages.length} messages`, 'success');
    } catch (e) { toast('Import error: ' + e.message, 'error'); }
    event.target.value = '';
}

// ==================== IMAGE GEN ====================
async function generateImage() {
    const input = document.getElementById('chat-input');
    const prompt = (input.value || '').trim();
    if (!prompt) return toast('Enter image prompt', 'error');
    input.value = '';
    autoResize(input);
    addMessage('user', `🎨 Generate image: ${prompt}`);
    updateConvMeta(prompt);
    isGenerating = true;
    toggleButtons(true);
    addTypingIndicator();
    try {
        const img = await puter.ai.txt2img(prompt);
        removeTypingIndicator();
        if (img?.src) addMessage('assistant', `Image: "${prompt}"`, { image: img.src });
        else addMessage('assistant', '❌ No image result');
        await saveCurrentMessages();
        updateConvMeta();
    } catch (e) {
        removeTypingIndicator();
        addMessage('assistant', `❌ Image error: ${e.message}`);
    }
    isGenerating = false;
    toggleButtons(false);
}

// ==================== CLEAR ====================
function clearChat() {
    if (!currentMessages.length) return;
    showModal(`
        <h3 style="margin-bottom:14px;">🗑️ Clear Chat?</h3>
        <p class="text-muted" style="margin-bottom:20px;">Delete all messages in this conversation?</p>
        <div class="btn-group">
            <button class="btn btn-danger" onclick="doClear()">🗑️ Clear</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function doClear() {
    closeModal();
    currentMessages = [];
    renderMessages();
    showWelcome(true);
    await saveCurrentMessages();
    const c = conversations.find(x => x.id === currentConversationId);
    if (c) { c.preview = ''; c.title = 'New Chat'; c.messageCount = 0; }
    await saveConversations();
    renderChatList();
    toast('Cleared', 'info');
}

function useSuggestion(t) { document.getElementById('chat-input').value = t; sendMessage(); }

// ==================== UI HELPERS ====================
function handleChatKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    updateCharCount();
}

function updateCharCount() {
    const i = document.getElementById('chat-input');
    const c = document.getElementById('char-count');
    if (c && i) c.textContent = (i.value || '').length + ' chars';
}

function focusInput() { setTimeout(() => document.getElementById('chat-input')?.focus(), 100); }

function toggleButtons(gen) {
    const s = document.getElementById('send-btn');
    const t = document.getElementById('stop-btn');
    if (s) s.style.display = gen ? 'none' : 'flex';
    if (t) t.style.display = gen ? 'flex' : 'none';
}

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function timeAgo(ds) {
    if (!ds) return '';
    const diff = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (isNaN(diff)) return '';
    if (diff < 10) return 'Just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(ds).toLocaleDateString();
}