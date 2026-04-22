// ===========================
// FILES.JS — File Manager
// ===========================

let currentPath = '/';
let currentFiles = [];
let fileView = 'list';
let editingFilePath = null;

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('/');
    setupDragDrop();
});

// ---- NAVIGATION ----
async function navigateTo(path) {
    currentPath = path.replace(/\/+$/, '') || '/';
    document.getElementById('current-path').textContent = currentPath;
    await loadFiles();
}

function goUp() {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/'));
}

function goHome() { navigateTo('/'); }

// ---- LOAD FILES ----
async function loadFiles() {
    const browser = document.getElementById('file-browser');
    browser.innerHTML = '<div class="file-loading"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const files = await puter.fs.readdir(currentPath);
        currentFiles = files.sort((a, b) => {
            if (a.is_dir && !b.is_dir) return -1;
            if (!a.is_dir && b.is_dir) return 1;
            return a.name.localeCompare(b.name);
        });
        renderFiles();
    } catch (e) {
        browser.innerHTML = `<div class="empty-state">❌ Error loading: ${e.message}</div>`;
    }
}

function renderFiles() {
    const browser = document.getElementById('file-browser');
    if (currentFiles.length === 0) {
        browser.innerHTML = '<div class="empty-state">📂 This folder is empty</div>';
        return;
    }

    if (fileView === 'list') {
        renderListView(browser);
    } else {
        renderGridView(browser);
    }
}

function renderListView(browser) {
    let html = `
        <div class="file-list-view">
            <div class="file-list-header">
                <span class="file-icon"></span>
                <span class="file-name">Name</span>
                <span class="file-size">Size</span>
                <span class="file-date">Modified</span>
                <span class="file-row-actions"></span>
            </div>
    `;

    currentFiles.forEach(f => {
        const icon = getFileIcon(f.name, f.is_dir);
        const path = (currentPath === '/' ? '' : currentPath) + '/' + f.name;
        html += `
            <div class="file-row" ondblclick="${f.is_dir ? `navigateTo('${path}')` : `openFile('${path}')`}">
                <span class="file-icon">${icon}</span>
                <span class="file-name">${f.name}</span>
                <span class="file-size">${f.is_dir ? '—' : formatSize(f.size)}</span>
                <span class="file-date">${formatDate(f.modified)}</span>
                <span class="file-row-actions">
                    ${!f.is_dir ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); openFile('${path}')" title="Edit">✏️</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); downloadFile('${path}', '${f.name}')" title="Download">⬇️</button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); confirmDelete('${path}')" title="Delete">🗑️</button>
                </span>
            </div>
        `;
    });

    html += '</div>';
    browser.innerHTML = html;
}

function renderGridView(browser) {
    let html = '<div class="file-grid-view">';
    currentFiles.forEach(f => {
        const icon = getFileIcon(f.name, f.is_dir);
        const path = (currentPath === '/' ? '' : currentPath) + '/' + f.name;
        html += `
            <div class="file-grid-item" ondblclick="${f.is_dir ? `navigateTo('${path}')` : `openFile('${path}')`}">
                <span class="file-icon">${icon}</span>
                <span class="file-name" title="${f.name}">${f.name}</span>
                <span class="file-size">${f.is_dir ? 'Folder' : formatSize(f.size)}</span>
            </div>
        `;
    });
    html += '</div>';
    browser.innerHTML = html;
}

function setView(view) {
    fileView = view;
    document.getElementById('view-grid').classList.toggle('active', view === 'grid');
    document.getElementById('view-list').classList.toggle('active', view === 'list');
    renderFiles();
}

function filterFiles() {
    const q = document.getElementById('file-search').value.toLowerCase();
    const rows = document.querySelectorAll('.file-row, .file-grid-item');
    rows.forEach(row => {
        const name = row.querySelector('.file-name')?.textContent?.toLowerCase() || '';
        row.style.display = name.includes(q) ? '' : 'none';
    });
}

function sortFiles() {
    const by = document.getElementById('file-sort').value;
    currentFiles.sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        switch (by) {
            case 'size': return (b.size || 0) - (a.size || 0);
            case 'date': return new Date(b.modified || 0) - new Date(a.modified || 0);
            case 'type':
                const extA = a.name.split('.').pop();
                const extB = b.name.split('.').pop();
                return extA.localeCompare(extB);
            default: return a.name.localeCompare(b.name);
        }
    });
    renderFiles();
}

// ---- FILE OPERATIONS ----
async function openFile(path) {
    try {
        const blob = await puter.fs.read(path);
        const text = await blob.text();
        editingFilePath = path;
        document.getElementById('editor-title').textContent = 'Editing: ' + path;
        document.getElementById('editor-content').value = text;
        document.getElementById('file-editor').style.display = 'block';
    } catch (e) {
        toast('Cannot open file: ' + e.message, 'error');
    }
}

async function saveEditorFile() {
    if (!editingFilePath) return;
    try {
        const content = document.getElementById('editor-content').value;
        await puter.fs.write(editingFilePath, content, { overwrite: true });
        toast('File saved!', 'success');
    } catch (e) {
        toast('Save error: ' + e.message, 'error');
    }
}

function downloadEditorFile() {
    const content = document.getElementById('editor-content').value;
    const name = editingFilePath.split('/').pop();
    downloadText(content, name);
    toast('Downloaded: ' + name, 'success');
}

function closeEditor() {
    document.getElementById('file-editor').style.display = 'none';
    editingFilePath = null;
}

async function downloadFile(path, name) {
    try {
        const blob = await puter.fs.read(path);
        downloadBlob(blob, name);
        toast('Downloaded: ' + name, 'success');
        // Log download
        await logDownload(name, path);
    } catch (e) {
        toast('Download error: ' + e.message, 'error');
    }
}

async function logDownload(name, path) {
    try {
        const raw = await puter.kv.get('puter_download_history');
        const history = raw ? JSON.parse(raw) : [];
        history.unshift({ name, path, time: new Date().toISOString() });
        if (history.length > 100) history.length = 100;
        await puter.kv.set('puter_download_history', JSON.stringify(history));
    } catch {}
}

function confirmDelete(path) {
    showModal(`
        <h3 style="margin-bottom:12px;">🗑️ Delete File?</h3>
        <p style="color:var(--text-muted); margin-bottom:20px;">Are you sure you want to delete:<br><strong>${path}</strong></p>
        <div class="btn-group">
            <button class="btn btn-danger" onclick="performDelete('${path}')">🗑️ Delete</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function performDelete(path) {
    try {
        await puter.fs.delete(path, { recursive: true });
        toast('Deleted!', 'success');
        closeModal();
        loadFiles();
    } catch (e) {
        toast('Delete error: ' + e.message, 'error');
    }
}

// ---- CREATE ----
function showNewFileModal() {
    showModal(`
        <h3 style="margin-bottom:12px;">📄 New File</h3>
        <input type="text" class="input" id="new-file-name" placeholder="filename.txt">
        <textarea class="input" id="new-file-content" placeholder="File content (optional)..." rows="4"></textarea>
        <div class="btn-group">
            <button class="btn btn-primary" onclick="createNewFile()">Create</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function createNewFile() {
    const name = document.getElementById('new-file-name').value.trim();
    const content = document.getElementById('new-file-content')?.value || '';
    if (!name) return toast('Enter file name', 'error');
    const path = (currentPath === '/' ? '' : currentPath) + '/' + name;
    try {
        await puter.fs.write(path, content, { overwrite: true });
        toast('File created!', 'success');
        closeModal();
        loadFiles();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

function showNewFolderModal() {
    showModal(`
        <h3 style="margin-bottom:12px;">📁 New Folder</h3>
        <input type="text" class="input" id="new-folder-name" placeholder="Folder name">
        <div class="btn-group">
            <button class="btn btn-primary" onclick="createNewFolder()">Create</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
    `);
}

async function createNewFolder() {
    const name = document.getElementById('new-folder-name').value.trim();
    if (!name) return toast('Enter folder name', 'error');
    const path = (currentPath === '/' ? '' : currentPath) + '/' + name;
    try {
        await puter.fs.mkdir(path);
        toast('Folder created!', 'success');
        closeModal();
        loadFiles();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

// ---- UPLOAD ----
function triggerUpload() {
    document.getElementById('file-upload-input').click();
}

async function handleUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    for (const file of files) {
        try {
            await puter.fs.upload([file], currentPath);
            toast('Uploaded: ' + file.name, 'success');
        } catch (e) {
            toast('Upload error: ' + e.message, 'error');
        }
    }
    loadFiles();
    event.target.value = '';
}

// ---- DRAG & DROP ----
function setupDragDrop() {
    const zone = document.getElementById('drop-zone');
    const body = document.body;

    body.addEventListener('dragenter', (e) => {
        e.preventDefault();
        zone.classList.add('active');
    });

    body.addEventListener('dragleave', (e) => {
        if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
            zone.classList.remove('active');
        }
    });

    body.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('active', 'dragover');
    });

    body.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('active', 'dragover');
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            try {
                await puter.fs.upload([file], currentPath);
                toast('Uploaded: ' + file.name, 'success');
            } catch (err) {
                toast('Upload error: ' + err.message, 'error');
            }
        }
        loadFiles();
    });
}