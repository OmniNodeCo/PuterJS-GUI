// ===========================
// MODELS.JS — All Puter.js AI Models
// ===========================

const AI_MODELS = {
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
        { id: 'gemma-2-2b-it', name: 'Gemma 2 2B', tag: 'Tiny' },
    ],
    'Meta (Llama)': [
        { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tag: 'Latest' },
        { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', tag: 'Huge' },
        { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', tag: 'Large' },
        { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', tag: 'Small' },
        { id: 'llama-3-70b', name: 'Llama 3 70B', tag: 'Older' },
        { id: 'llama-3-8b', name: 'Llama 3 8B', tag: 'Lite' },
    ],
    'Mistral': [
        { id: 'mistral-large-2', name: 'Mistral Large 2', tag: 'Best' },
        { id: 'mistral-medium', name: 'Mistral Medium', tag: 'Mid' },
        { id: 'mistral-small', name: 'Mistral Small', tag: 'Fast' },
        { id: 'mistral-nemo', name: 'Mistral Nemo', tag: 'New' },
        { id: 'mistral-7b', name: 'Mistral 7B', tag: 'Classic' },
        { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', tag: 'MoE' },
        { id: 'mixtral-8x22b', name: 'Mixtral 8x22B', tag: 'Large MoE' },
        { id: 'codestral', name: 'Codestral', tag: 'Code' },
        { id: 'pixtral-12b', name: 'Pixtral 12B', tag: 'Vision' },
    ],
    'DeepSeek': [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', tag: 'Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', tag: 'R1' },
    ],
    'Qwen': [
        { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', tag: 'Large' },
        { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', tag: 'Code' },
        { id: 'qwen-2-72b', name: 'Qwen 2 72B', tag: 'Older' },
        { id: 'qwq-32b', name: 'QwQ 32B', tag: 'Reasoning' },
    ],
    'xAI': [
        { id: 'grok-2', name: 'Grok 2', tag: 'Latest' },
        { id: 'grok-beta', name: 'Grok Beta', tag: 'Beta' },
    ],
    'Other': [
        { id: 'nous-hermes-2-mixtral', name: 'Nous Hermes 2', tag: 'Community' },
        { id: 'wizardlm-2-8x22b', name: 'WizardLM 2 8x22B', tag: 'MoE' },
        { id: 'databricks-dbrx-instruct', name: 'DBRX Instruct', tag: 'Enterprise' },
        { id: 'command-r-plus', name: 'Command R+', tag: 'Cohere' },
        { id: 'command-r', name: 'Command R', tag: 'Cohere' },
        { id: 'phi-3-medium', name: 'Phi-3 Medium', tag: 'Microsoft' },
        { id: 'phi-3-mini', name: 'Phi-3 Mini', tag: 'Microsoft' },
    ],
};

let selectedModel = 'gpt-4o';

function getAllModels() {
    const all = [];
    Object.entries(AI_MODELS).forEach(([group, models]) => {
        models.forEach(m => all.push({ ...m, group }));
    });
    return all;
}

function renderModelDropdown(filter = '') {
    const dd = document.getElementById('model-dropdown');
    if (!dd) return;
    dd.innerHTML = '';
    const lowerFilter = filter.toLowerCase();

    Object.entries(AI_MODELS).forEach(([group, models]) => {
        const filtered = models.filter(m =>
            m.name.toLowerCase().includes(lowerFilter) ||
            m.id.toLowerCase().includes(lowerFilter) ||
            m.tag.toLowerCase().includes(lowerFilter) ||
            group.toLowerCase().includes(lowerFilter)
        );
        if (filtered.length === 0) return;

        const groupLabel = document.createElement('div');
        groupLabel.className = 'model-group-label';
        groupLabel.textContent = `${group} (${filtered.length})`;
        dd.appendChild(groupLabel);

        filtered.forEach(m => {
            const opt = document.createElement('div');
            opt.className = `model-option ${m.id === selectedModel ? 'selected' : ''}`;
            opt.innerHTML = `
                <span class="model-name">${m.name}</span>
                <span class="model-tag">${m.tag}</span>
            `;
            opt.onclick = () => selectModel(m.id, m.name);
            dd.appendChild(opt);
        });
    });

    if (dd.children.length === 0) {
        dd.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted);">No models found</div>';
    }
}

function selectModel(id, name) {
    selectedModel = id;
    const badge = document.getElementById('selected-model-badge');
    const indicator = document.getElementById('model-indicator');
    const searchInput = document.getElementById('model-search');
    if (badge) badge.textContent = id;
    if (indicator) indicator.textContent = id;
    if (searchInput) searchInput.value = '';
    hideModelDropdown();
    renderModelDropdown();
    toast(`Model: ${name || id}`, 'info');
}

function showModelDropdown() {
    const dd = document.getElementById('model-dropdown');
    if (dd) {
        renderModelDropdown();
        dd.classList.add('open');
    }
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