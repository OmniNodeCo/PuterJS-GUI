// ===========================
// MODELS.JS — Dynamic + Fallback + Progress
// ===========================

let selectedModel = 'gpt-4o-mini';
let loadedModels = [];
let modelsByProvider = {};
let modelLoadCallback = null; // set by chat.js

const STATIC_MODELS = {
    'OpenAI': [
        { id: 'gpt-4o', name: 'GPT-4o', tag: 'Best' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'Fast' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tag: 'Smart' },
        { id: 'gpt-4', name: 'GPT-4', tag: 'Classic' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tag: 'Legacy' },
        { id: 'o1-mini', name: 'O1 Mini', tag: 'Reasoning' },
        { id: 'o3-mini', name: 'O3 Mini', tag: 'New' },
    ],
    'Anthropic': [
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tag: 'Top' },
        { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', tag: 'Fast' },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', tag: 'Smart' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', tag: 'Balanced' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', tag: 'Quick' },
    ],
    'Google': [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Latest' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Fast' },
        { id: 'gemma-2-27b-it', name: 'Gemma 2 27B', tag: 'Open' },
        { id: 'gemma-2-9b-it', name: 'Gemma 2 9B', tag: 'Small' },
    ],
    'Meta': [
        { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tag: 'Latest' },
        { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', tag: 'Huge' },
        { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', tag: 'Large' },
        { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', tag: 'Small' },
    ],
    'Mistral': [
        { id: 'mistral-large-2', name: 'Mistral Large 2', tag: 'Best' },
        { id: 'mistral-nemo', name: 'Mistral Nemo', tag: 'New' },
        { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', tag: 'MoE' },
        { id: 'codestral', name: 'Codestral', tag: 'Code' },
    ],
    'DeepSeek': [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', tag: 'Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1', tag: 'Reason' },
    ],
    'xAI': [
        { id: 'grok-2', name: 'Grok 2', tag: 'Latest' },
        { id: 'grok-beta', name: 'Grok Beta', tag: 'Beta' },
    ],
};

const PROVIDER_LIST = [
    'openai', 'anthropic', 'google', 'mistralai', 'meta-llama',
    'deepseek', 'xai', 'cohere', 'qwen', 'together',
    'groq', 'perplexity', 'fireworks'
];

// ---- progress helper ----
function emitProgress(step, pct, detail) {
    if (typeof modelLoadCallback === 'function') {
        modelLoadCallback({ step, pct, detail });
    }
}

// ---- INIT ----
async function initModels() {
    const badge = document.getElementById('selected-model-badge');
    const indicator = document.getElementById('model-indicator');
    if (badge) badge.textContent = '⏳ Loading...';

    let loaded = false;

    // Step 1: listModels() no args
    emitProgress('api-noarg', 5, 'Trying puter.ai.listModels()...');
    if (!loaded) {
        try {
            const result = await puter.ai.listModels();
            const parsed = normalizeModelList(result);
            if (parsed && parsed.length > 0) {
                loadedModels = parsed;
                modelsByProvider = groupByProvider(parsed);
                loaded = true;
                emitProgress('api-noarg-done', 90, `Found ${parsed.length} models`);
            }
        } catch (e) {
            emitProgress('api-noarg-fail', 10, 'listModels() failed: ' + e.message);
        }
    }

    // Step 2: listModels(null)
    if (!loaded) {
        emitProgress('api-null', 15, 'Trying listModels(null)...');
        try {
            const result = await puter.ai.listModels(null);
            const parsed = normalizeModelList(result);
            if (parsed && parsed.length > 0) {
                loadedModels = parsed;
                modelsByProvider = groupByProvider(parsed);
                loaded = true;
                emitProgress('api-null-done', 90, `Found ${parsed.length} models`);
            }
        } catch (e) {
            emitProgress('api-null-fail', 20, 'listModels(null) failed');
        }
    }

    // Step 3: per-provider
    if (!loaded) {
        emitProgress('per-provider-start', 25, 'Scanning providers...');
        modelsByProvider = {};
        loadedModels = [];
        let anyWorked = false;

        for (let i = 0; i < PROVIDER_LIST.length; i++) {
            const p = PROVIDER_LIST[i];
            const pct = 25 + Math.round((i / PROVIDER_LIST.length) * 55);
            emitProgress('per-provider', pct, `Checking ${p}...`);
            try {
                const result = await puter.ai.listModels(p);
                const parsed = normalizeModelList(result);
                if (parsed && parsed.length > 0) {
                    const label = formatProviderName(p);
                    modelsByProvider[label] = parsed.map(m => ({ ...m, provider: label }));
                    loadedModels.push(...modelsByProvider[label]);
                    anyWorked = true;
                    emitProgress('per-provider-hit', pct, `${p}: ${parsed.length} models`);
                }
            } catch {}
        }

        if (anyWorked) {
            loaded = true;
            emitProgress('per-provider-done', 85, `${loadedModels.length} models from providers`);
        } else {
            emitProgress('per-provider-fail', 80, 'No providers responded');
        }
    }

    // Step 4: fallback
    if (!loaded) {
        emitProgress('fallback', 85, 'Using static fallback models...');
        useFallback();
        emitProgress('fallback-done', 95, `${loadedModels.length} fallback models loaded`);
    }

    // Done
    if (badge) badge.textContent = selectedModel;
    if (indicator) indicator.textContent = selectedModel;
    renderModelDropdown();
    emitProgress('complete', 100, `${loadedModels.length} models ready`);
    return modelsByProvider;
}

// ---- NORMALIZE ----
function normalizeModelList(result) {
    if (!result) return null;

    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
        return result.map(id => ({ id, name: formatModelName(id), provider: guessProvider(id), tag: getModelTag(id) }));
    }
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
        return result.map(m => normalizeEntry(m));
    }
    if (result.models && Array.isArray(result.models)) return normalizeModelList(result.models);
    if (result.data && Array.isArray(result.data)) return normalizeModelList(result.data);
    if (typeof result === 'object' && !Array.isArray(result)) {
        const all = [];
        Object.entries(result).forEach(([prov, models]) => {
            if (Array.isArray(models)) {
                models.forEach(m => {
                    all.push(typeof m === 'string'
                        ? { id: m, name: formatModelName(m), provider: prov, tag: getModelTag(m) }
                        : normalizeEntry(m, prov)
                    );
                });
            }
        });
        return all.length > 0 ? all : null;
    }
    return null;
}

function normalizeEntry(m, fallbackProvider) {
    if (typeof m === 'string') {
        return { id: m, name: formatModelName(m), provider: fallbackProvider || guessProvider(m), tag: getModelTag(m) };
    }
    const id = m.id || m.model_id || m.model || m.name || m.slug || String(m);
    const name = m.name || m.display_name || m.title || formatModelName(id);
    const provider = m.provider || m.vendor || m.company || m.owned_by || fallbackProvider || guessProvider(id);
    const tag = m.tag || m.type || m.label || getModelTag(id);
    return { id, name, provider, tag };
}

function groupByProvider(models) {
    const g = {};
    models.forEach(m => {
        const p = capitalize(m.provider || guessProvider(m.id));
        if (!g[p]) g[p] = [];
        g[p].push({ ...m, provider: p });
    });
    return g;
}

function guessProvider(id) {
    if (!id) return 'Other';
    const l = id.toLowerCase();
    if (l.includes('gpt') || l.includes('o1-') || l.includes('o3-') || l.includes('davinci')) return 'OpenAI';
    if (l.includes('claude')) return 'Anthropic';
    if (l.includes('gemini') || l.includes('gemma') || l.includes('palm')) return 'Google';
    if (l.includes('llama') || l.includes('meta')) return 'Meta';
    if (l.includes('mistral') || l.includes('mixtral') || l.includes('codestral') || l.includes('pixtral')) return 'Mistral';
    if (l.includes('deepseek')) return 'DeepSeek';
    if (l.includes('grok') || l.includes('xai')) return 'xAI';
    if (l.includes('qwen') || l.includes('qwq')) return 'Qwen';
    if (l.includes('command')) return 'Cohere';
    if (l.includes('phi')) return 'Microsoft';
    if (l.includes('dbrx')) return 'Databricks';
    return 'Other';
}

function formatModelName(id) {
    if (!id) return 'Unknown';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\bGpt\b/g, 'GPT').replace(/\bAi\b/g, 'AI')
        .replace(/(\d+)b\b/gi, '$1B');
}

function formatProviderName(p) {
    const map = {
        'openai': 'OpenAI', 'anthropic': 'Anthropic', 'google': 'Google',
        'mistralai': 'Mistral', 'meta-llama': 'Meta', 'deepseek': 'DeepSeek',
        'xai': 'xAI', 'cohere': 'Cohere', 'qwen': 'Qwen',
        'together': 'Together', 'groq': 'Groq', 'perplexity': 'Perplexity',
        'fireworks': 'Fireworks',
    };
    return map[p] || capitalize(p);
}

function getModelTag(id) {
    if (!id) return '';
    const l = id.toLowerCase();
    if (l.includes('mini') || l.includes('small') || l.includes('haiku') || l.includes('flash')) return 'Fast';
    if (l.includes('turbo')) return 'Turbo';
    if (l.includes('opus') || l.includes('large') || l.includes('405b') || l.includes('70b') || l.includes('72b')) return 'Pro';
    if (l.includes('code') || l.includes('coder') || l.includes('codestral')) return 'Code';
    if (l.includes('vision') || l.includes('pixtral')) return 'Vision';
    if (l.includes('reason') || l.includes('o1') || l.includes('o3') || l.includes('r1') || l.includes('qwq')) return 'Reason';
    if (l.includes('embed')) return 'Embed';
    return '';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Other'; }

function useFallback() {
    modelsByProvider = {};
    loadedModels = [];
    Object.entries(STATIC_MODELS).forEach(([provider, models]) => {
        modelsByProvider[provider] = models.map(m => ({ ...m, provider }));
        loadedModels.push(...modelsByProvider[provider]);
    });
}

// ---- DROPDOWN ----
function renderModelDropdown(filter = '') {
    const dd = document.getElementById('model-dropdown');
    if (!dd) return;
    dd.innerHTML = '';
    const q = (filter || '').toLowerCase().trim();

    if (loadedModels.length === 0) {
        dd.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);">
            <div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto 8px;"></div>Loading models...</div>`;
        return;
    }

    let total = 0;
    Object.keys(modelsByProvider).sort().forEach(provider => {
        const models = modelsByProvider[provider] || [];
        const filtered = q ? models.filter(m =>
            (m.id || '').toLowerCase().includes(q) ||
            (m.name || '').toLowerCase().includes(q) ||
            (m.tag || '').toLowerCase().includes(q) ||
            provider.toLowerCase().includes(q)
        ) : models;
        if (filtered.length === 0) return;

        const label = document.createElement('div');
        label.className = 'model-group-label';
        label.textContent = `${provider} (${filtered.length})`;
        dd.appendChild(label);

        filtered.forEach(m => {
            const opt = document.createElement('div');
            opt.className = `model-option${m.id === selectedModel ? ' selected' : ''}`;
            const tag = m.tag || getModelTag(m.id);
            opt.innerHTML = `
                <div>
                    <div class="model-name">${esc(m.name || m.id)}</div>
                    <div class="model-id-small">${esc(m.id)}</div>
                </div>
                ${tag ? `<span class="model-tag">${esc(tag)}</span>` : ''}
            `;
            opt.onclick = () => selectModel(m.id, m.name || m.id);
            dd.appendChild(opt);
            total++;
        });
    });

    if (total === 0) {
        dd.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);">No models matching "${esc(filter)}"</div>`;
    }
}

function selectModel(id, name) {
    selectedModel = id;
    const badge = document.getElementById('selected-model-badge');
    const indicator = document.getElementById('model-indicator');
    const search = document.getElementById('model-search');
    if (badge) badge.textContent = id;
    if (indicator) indicator.textContent = id;
    if (search) search.value = '';
    hideModelDropdown();
    renderModelDropdown();
    if (typeof toast === 'function') toast(`Model: ${name || id}`, 'info');
}

function showModelDropdown() {
    const dd = document.getElementById('model-dropdown');
    if (dd) { renderModelDropdown(); dd.classList.add('open'); }
}

function hideModelDropdown() {
    const dd = document.getElementById('model-dropdown');
    if (dd) dd.classList.remove('open');
}

function filterModels() {
    const input = document.getElementById('model-search');
    renderModelDropdown(input ? input.value : '');
    showModelDropdown();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }