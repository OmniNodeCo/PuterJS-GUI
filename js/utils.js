// ===========================
// UTILS.JS — Shared Utilities
// ===========================

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('puter-theme', next);
    toast(`Theme: ${next === 'dark' ? '🌙 Dark' : '☀️ Light'}`, 'info');
}

// Load saved theme
(function loadTheme() {
    const saved = localStorage.getItem('puter-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// Toast notifications
function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    el.style.animationDuration = `0.4s, 0.4s`;
    el.style.animationDelay = `0s, ${duration / 1000 - 0.4}s`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

// Modal
function showModal(html) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    modal.innerHTML = html;
    backdrop.classList.add('active');
    modal.classList.add('active');
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    backdrop.classList.remove('active');
    modal.classList.remove('active');
}

// Format file size
function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get file icon by extension
function getFileIcon(name, isDir) {
    if (isDir) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        txt: '📄', md: '📝', json: '📋', js: '🟨', ts: '🔷',
        html: '🌐', css: '🎨', py: '🐍', java: '☕', cpp: '⚙️',
        c: '⚙️', rb: '💎', go: '🔵', rs: '🦀', php: '🐘',
        sql: '🗃️', xml: '📰', yaml: '📑', yml: '📑', toml: '📑',
        png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🎨',
        webp: '🖼️', bmp: '🖼️', ico: '🖼️',
        mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', webm: '🎬',
        mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵',
        pdf: '📕', doc: '📘', docx: '📘', xls: '📊', xlsx: '📊',
        ppt: '📙', pptx: '📙', csv: '📊',
        zip: '📦', rar: '📦', tar: '📦', gz: '📦', '7z': '📦',
        exe: '⚡', dmg: '💿', iso: '💿',
        sh: '🔧', bat: '🔧', dockerfile: '🐳',
    };
    return icons[ext] || '📄';
}

// Download blob as file
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download text as file
function downloadText(text, filename, mimeType = 'text/plain') {
    const blob = new Blob([text], { type: mimeType });
    downloadBlob(blob, filename);
}

// Simple markdown to HTML (basic)
function mdToHtml(md) {
    return md
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/\n/g, '<br>');
}

// Generate unique ID
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Load username in sidebar
async function loadSidebarUser() {
    try {
        const user = await puter.auth.getUser();
        const el = document.getElementById('sidebar-username');
        if (el && user && user.username) {
            el.textContent = user.username;
        }
    } catch (e) { /* ignore */ }
}

// Init sidebar user on page load
document.addEventListener('DOMContentLoaded', loadSidebarUser);

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !e.target.classList.contains('mobile-menu')) {
            sidebar.classList.remove('open');
        }
    }
});

// Close model dropdown on outside click
document.addEventListener('click', (e) => {
    const dd = document.getElementById('model-dropdown');
    const input = document.getElementById('model-search');
    if (dd && !dd.contains(e.target) && e.target !== input) {
        dd.classList.remove('open');
    }
});