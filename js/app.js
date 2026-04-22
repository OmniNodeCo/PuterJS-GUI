// ===========================
// APP.JS — Dashboard
// ===========================

async function loadDashboard() {
    // Files count
    try {
        const files = await puter.fs.readdir('/');
        document.getElementById('stat-files').textContent = files.length;
    } catch { document.getElementById('stat-files').textContent = '0'; }

    // Saved chats count
    try {
        const chatsRaw = await puter.kv.get('puter_chat_list');
        const chats = chatsRaw ? JSON.parse(chatsRaw) : [];
        document.getElementById('stat-chats').textContent = chats.length;
    } catch { document.getElementById('stat-chats').textContent = '0'; }

    // KV entries
    try {
        const keys = await puter.kv.list();
        document.getElementById('stat-kv').textContent = keys ? keys.length : 0;
    } catch { document.getElementById('stat-kv').textContent = '0'; }

    // Downloads
    try {
        const dlRaw = await puter.kv.get('puter_download_history');
        const dls = dlRaw ? JSON.parse(dlRaw) : [];
        document.getElementById('stat-downloads').textContent = dls.length;
    } catch { document.getElementById('stat-downloads').textContent = '0'; }
}

async function quickAI() {
    const input = document.getElementById('quick-prompt');
    const output = document.getElementById('quick-output');
    const prompt = input.value.trim();
    if (!prompt) return toast('Enter a prompt', 'error');

    output.textContent = '⏳ Thinking...';
    try {
        const res = await puter.ai.chat(prompt);
        output.textContent = res?.message?.content || String(res);
        toast('AI responded!', 'success');
    } catch (e) {
        output.textContent = '❌ Error: ' + e.message;
        toast('AI error', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadDashboard);