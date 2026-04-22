// ===========================
// DOWNLOADS.JS — Downloads Manager
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    loadSavedChatsForDownload();
});

// ---- DOWNLOAD FROM CLOUD ----
async function downloadFromCloud() {
    const path = document.getElementById('download-path').value.trim();
    if (!path) return toast('Enter a file path', 'error');
    try {
        const blob = await puter.fs.read(path);
        const name = path.split('/').pop();
        downloadBlob(blob, name);
        toast('Downloaded: ' + name, 'success');
        await logDownload(name, path);
        loadDownloadHistory();
    } catch (e) {
        toast('Download error: ' + e.message, 'error');
    }
}

async function logDownload(name, path) {
    try {
        const raw = await puter.kv.get('puter_download_history');
        const history = raw ? JSON.parse(raw) : [];
        history.unshift({ name, path, time: new Date().toISOString() });
        if (history.length > 200) history.length = 200;
        await puter.kv.set('puter_download_history', JSON.stringify(history));
    } catch {}
}

// ---- BATCH DOWNLOAD ----
let batchFiles = [];

async function loadCloudFiles() {
    const list = document.getElementById('batch-file-list');
    list.innerHTML = '<div class="empty-state"><div class="spinner"></div>Loading...</div>';
    try {
        const files = await puter.fs.readdir('/');
        batchFiles = files.filter(f => !f.is_dir);
        if (batchFiles.length === 0) {
            list.innerHTML = '<div class="empty-state">No files found in root directory.</div>';
            return;
        }
        list.innerHTML = batchFiles.map((f, i) => `
            <div class="batch-item" onclick="toggleBatch(${i}, this)">
                <input type="checkbox" id="batch-${i}" onclick="event.stopPropagation()">
                <span>${getFileIcon(f.name, false)}</span>
                <span style="flex:1;">${f.name}</span>
                <span style="color:var(--text-muted); font-size:0.8rem;">${formatSize(f.size)}</span>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
    }
}

function toggleBatch(idx, el) {
    const cb = document.getElementById('batch-' + idx);
    cb.checked = !cb.checked;
    el.classList.toggle('selected', cb.checked);
}

function selectAllBatch() {
    batchFiles.forEach((_, i) => {
        const cb = document.getElementById('batch-' + i);
        const el = cb?.closest('.batch-item');
        if (cb) { cb.checked = true; if (el) el.classList.add('selected'); }
    });
}

async function downloadSelected() {
    let count = 0;
    for (let i = 0; i < batchFiles.length; i++) {
        const cb = document.getElementById('batch-' + i);
        if (cb && cb.checked) {
            try {
                const blob = await puter.fs.read('/' + batchFiles[i].name);
                downloadBlob(blob, batchFiles[i].name);
                await logDownload(batchFiles[i].name, '/' + batchFiles[i].name);
                count++;
            } catch {}
        }
    }
    toast(`Downloaded ${count} file(s)`, 'success');
    loadDownloadHistory();
}

// ---- CHAT DOWNLOADS ----
async function loadSavedChatsForDownload() {
    const list = document.getElementById('download-chat-list');
    try {
        const raw = await puter.kv.get('puter_chat_list');
        const chats = raw ? JSON.parse(raw) : [];
        if (chats.length === 0) {
            list.innerHTML = '<div class="empty-state">No saved chats found.</div>';
            return;
        }
        list.innerHTML = chats.map(c => `
            <div class="download-chat-item">
                <div>
                    <div style="font-weight:600; font-size:0.88rem;">${escapeHtml(c.title)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${c.model || 'gpt-4o'} · ${timeAgo(c.updated)}</div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" onclick="downloadChatJSON('${c.id}', '${escapeHtml(c.title)}')">📋 JSON</button>
                    <button class="btn btn-secondary btn-sm" onclick="downloadChatMarkdown('${c.id}', '${escapeHtml(c.title)}')">📝 MD</button>
                </div>
            </div>
        `).join('');
    } catch {
        list.innerHTML = '<div class="empty-state">Could not load chats.</div>';
    }
}

async function downloadChatJSON(id, title) {
    try {
        const raw = await puter.kv.get(`puter_chat_${id}`);
        const messages = raw ? JSON.parse(raw) : [];
        const data = { id, title, messages, exported: new Date().toISOString() };
        downloadText(JSON.stringify(data, null, 2), `chat-${id}.json`, 'application/json');
        toast('Downloaded chat JSON', 'success');
        await logDownload(`chat-${id}.json`, 'kv');
        loadDownloadHistory();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function downloadChatMarkdown(id, title) {
    try {
        const raw = await puter.kv.get(`puter_chat_${id}`);
        const messages = raw ? JSON.parse(raw) : [];
        let md = `# ${title}\n\n**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
        messages.forEach(m => {
            const role = m.role === 'user' ? '👤 You' : '🤖 AI';
            md += `### ${role}\n\n${m.content}\n\n---\n\n`;
        });
        downloadText(md, `chat-${id}.md`);
        toast('Downloaded chat Markdown', 'success');
        await logDownload(`chat-${id}.md`, 'kv');
        loadDownloadHistory();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

// ---- KV EXPORT ----
async function downloadKVData() {
    try {
        const keys = await puter.kv.list(true);
        if (!keys || keys.length === 0) return toast('No KV data to export', 'error');
        const data = {};
        keys.forEach(k => { data[k.key] = k.value; });
        downloadText(JSON.stringify(data, null, 2), 'puter-kv-export.json', 'application/json');
        toast('KV data exported!', 'success');
        await logDownload('puter-kv-export.json', 'kv');
        loadDownloadHistory();
    } catch (e) {
        toast('Export error: ' + e.message, 'error');
    }
}

// ---- DOWNLOAD HISTORY ----
async function loadDownloadHistory() {
    const container = document.getElementById('download-history');
    try {
        const raw = await puter.kv.get('puter_download_history');
        const history = raw ? JSON.parse(raw) : [];
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">No downloads yet.</div>';
            return;
        }
        container.innerHTML = history.slice(0, 50).map(h => `
            <div class="download-history-item">
                <span>${getFileIcon(h.name, false)}</span>
                <span style="flex:1;">${h.name}</span>
                <span style="color:var(--text-muted); font-size:0.78rem;">${timeAgo(h.time)}</span>
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<div class="empty-state">Could not load history.</div>';
    }
}

async function clearDownloadHistory() {
    await puter.kv.del('puter_download_history');
    loadDownloadHistory();
    toast('History cleared', 'info');
}

// ---- HELPERS (duplicated here for standalone page use) ----
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
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}