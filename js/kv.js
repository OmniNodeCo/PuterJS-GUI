// ===========================
// KV.JS — Key-Value Store
// ===========================

let allKVEntries = [];

async function kvSet() {
    const key = document.getElementById('kv-key').value.trim();
    const val = document.getElementById('kv-value').value;
    if (!key) return toast('Enter a key', 'error');
    try {
        await puter.kv.set(key, val);
        toast(`Set: ${key}`, 'success');
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvSetJSON() {
    const key = document.getElementById('kv-key').value.trim();
    const val = document.getElementById('kv-value').value;
    if (!key) return toast('Enter a key', 'error');
    try {
        JSON.parse(val); // validate
        await puter.kv.set(key, val);
        toast(`Set JSON: ${key}`, 'success');
        kvLoadAll();
    } catch (e) {
        toast('Invalid JSON or error: ' + e.message, 'error');
    }
}

async function kvGet() {
    const key = document.getElementById('kv-get-key').value.trim();
    if (!key) return toast('Enter a key', 'error');
    try {
        const val = await puter.kv.get(key);
        const output = document.getElementById('kv-output');
        if (val !== null && val !== undefined) {
            try {
                const parsed = JSON.parse(val);
                output.textContent = JSON.stringify(parsed, null, 2);
            } catch {
                output.textContent = val;
            }
        } else {
            output.textContent = '(key not found)';
        }
    } catch (e) {
        document.getElementById('kv-output').textContent = 'Error: ' + e.message;
    }
}

async function kvDel() {
    const key = document.getElementById('kv-get-key').value.trim();
    if (!key) return toast('Enter a key', 'error');
    try {
        await puter.kv.del(key);
        toast(`Deleted: ${key}`, 'success');
        document.getElementById('kv-output').textContent = `✅ Deleted: ${key}`;
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvIncr() {
    const key = document.getElementById('kv-get-key').value.trim();
    if (!key) return toast('Enter a key', 'error');
    try {
        await puter.kv.incr(key);
        const val = await puter.kv.get(key);
        document.getElementById('kv-output').textContent = `${key} = ${val}`;
        toast(`Incremented: ${key}`, 'success');
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvDecr() {
    const key = document.getElementById('kv-get-key').value.trim();
    if (!key) return toast('Enter a key', 'error');
    try {
        await puter.kv.decr(key);
        const val = await puter.kv.get(key);
        document.getElementById('kv-output').textContent = `${key} = ${val}`;
        toast(`Decremented: ${key}`, 'success');
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvLoadAll() {
    const tbody = document.getElementById('kv-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner"></div></td></tr>';
    try {
        const keys = await puter.kv.list(true);
        allKVEntries = keys || [];
        renderKVTable(allKVEntries);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Error: ${e.message}</td></tr>`;
    }
}

function renderKVTable(entries) {
    const tbody = document.getElementById('kv-table-body');
    if (!entries || entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No entries found</td></tr>';
        return;
    }
    tbody.innerHTML = entries.map(e => {
        let displayVal = e.value;
        if (typeof displayVal === 'string' && displayVal.length > 100) {
            displayVal = displayVal.substring(0, 100) + '…';
        }
        return `
            <tr>
                <td style="font-weight:600; color:var(--accent-primary); font-family:monospace; font-size:0.82rem;">
                    ${escapeHtml(e.key)}
                </td>
                <td style="font-size:0.82rem; font-family:monospace; color:var(--text-secondary); max-width:400px; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHtml(String(displayVal))}
                </td>
                <td>
                    <div class="btn-group" style="margin:0;">
                        <button class="btn btn-ghost btn-sm" onclick="kvEditEntry('${escapeAttr(e.key)}')">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="kvCopyValue('${escapeAttr(e.key)}')">📋</button>
                        <button class="btn btn-danger btn-sm" onclick="kvDeleteEntry('${escapeAttr(e.key)}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterKV() {
    const q = document.getElementById('kv-filter').value.toLowerCase();
    const filtered = allKVEntries.filter(e => 
        e.key.toLowerCase().includes(q) || String(e.value).toLowerCase().includes(q)
    );
    renderKVTable(filtered);
}

async function kvEditEntry(key) {
    try {
        const val = await puter.kv.get(key);
        document.getElementById('kv-key').value = key;
        document.getElementById('kv-value').value = val || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvCopyValue(key) {
    try {
        const val = await puter.kv.get(key);
        navigator.clipboard.writeText(val || '');
        toast('Copied value!', 'success');
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvDeleteEntry(key) {
    try {
        await puter.kv.del(key);
        toast(`Deleted: ${key}`, 'success');
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvDeleteAll() {
    if (!confirm('Delete ALL KV entries? This cannot be undone!')) return;
    try {
        const keys = await puter.kv.list();
        for (const k of (keys || [])) {
            await puter.kv.del(k.key || k);
        }
        toast('All entries deleted', 'success');
        kvLoadAll();
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

async function kvExport() {
    try {
        const keys = await puter.kv.list(true);
        if (!keys || keys.length === 0) return toast('Nothing to export', 'error');
        const data = {};
        keys.forEach(k => { data[k.key] = k.value; });
        downloadText(JSON.stringify(data, null, 2), 'kv-export.json', 'application/json');
        toast('Exported!', 'success');
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

// Helpers
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}