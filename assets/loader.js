// ===========================
// LOADER.JS — Loading Utilities
// ===========================

class PageLoader {
    constructor(options = {}) {
        this.steps = options.steps || [];
        this.currentStep = -1;
        this.progress = 0;
        this.container = null;
        this.onComplete = options.onComplete || null;
        this.autoHideDelay = options.autoHideDelay ?? 600;
        this.create();
    }

    create() {
        this.container = document.createElement('div');
        this.container.className = 'page-loader';
        this.container.id = 'page-loader';

        const stepsHtml = this.steps.map((step, i) => `
            <div class="loader-step" id="loader-step-${i}">
                <span class="step-icon">○</span>
                <span class="step-label">${step.label}</span>
                <span class="step-result" id="loader-step-result-${i}"></span>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="orbit-loader">
                <div class="orbit-ring"></div>
                <div class="orbit-ring"></div>
                <div class="orbit-ring"></div>
                <div class="orbit-center"></div>
            </div>
            <div class="loader-title">Puter Platform</div>
            <div class="loader-subtitle" id="loader-status">Initializing...</div>
            <div class="progress-container">
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" id="loader-progress-fill"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-label" id="loader-progress-label">
                        <span class="mini-spinner"></span>
                        <span id="loader-progress-text">Loading...</span>
                    </span>
                    <span class="progress-percentage" id="loader-progress-pct">0%</span>
                </div>
            </div>
            <div class="loader-steps" id="loader-steps">${stepsHtml}</div>
        `;

        document.body.prepend(this.container);
    }

    setStatus(text) {
        const el = document.getElementById('loader-status');
        if (el) el.textContent = text;
    }

    setProgressText(text) {
        const el = document.getElementById('loader-progress-text');
        if (el) el.textContent = text;
    }

    setProgress(pct) {
        this.progress = Math.min(100, Math.max(0, pct));
        const fill = document.getElementById('loader-progress-fill');
        const pctEl = document.getElementById('loader-progress-pct');
        if (fill) fill.style.width = this.progress + '%';
        if (pctEl) pctEl.textContent = Math.round(this.progress) + '%';
    }

    startStep(idx, label) {
        this.currentStep = idx;
        const el = document.getElementById(`loader-step-${idx}`);
        if (el) {
            el.className = 'loader-step active';
            el.querySelector('.step-icon').textContent = '◌';
            if (label) el.querySelector('.step-label').textContent = label;
        }
        this.setProgressText(label || this.steps[idx]?.label || 'Loading...');
    }

    completeStep(idx, result, isError = false) {
        const el = document.getElementById(`loader-step-${idx}`);
        const resultEl = document.getElementById(`loader-step-result-${idx}`);
        if (el) {
            el.className = isError ? 'loader-step error' : 'loader-step done';
            el.querySelector('.step-icon').textContent = isError ? '✕' : '✓';
        }
        if (resultEl) resultEl.textContent = result || '';
    }

    async hide() {
        return new Promise(resolve => {
            this.setProgress(100);
            this.setStatus('Ready!');
            this.setProgressText('Complete');
            setTimeout(() => {
                if (this.container) this.container.classList.add('hidden');
                setTimeout(() => {
                    if (this.container && this.container.parentNode) {
                        this.container.parentNode.removeChild(this.container);
                    }
                    resolve();
                }, 500);
            }, this.autoHideDelay);
        });
    }
}

// ==================== INLINE PROGRESS BAR ====================

class InlineProgress {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.height = options.height || '4px';
        this.showLabel = options.showLabel !== false;
        this.create();
    }

    create() {
        if (!this.container) return;
        this.el = document.createElement('div');
        this.el.className = 'inline-progress-wrap';
        this.el.innerHTML = `
            <div class="progress-bar-wrap" style="height:${this.height};">
                <div class="progress-bar-fill" style="width:0%;"></div>
            </div>
            ${this.showLabel ? `
                <div class="progress-info" style="margin-top:4px;">
                    <span class="progress-label">
                        <span class="mini-spinner"></span>
                        <span class="inline-progress-text">Loading...</span>
                    </span>
                    <span class="progress-percentage inline-progress-pct">0%</span>
                </div>
            ` : ''}
        `;
        this.container.prepend(this.el);
    }

    update(pct, text) {
        if (!this.el) return;
        const fill = this.el.querySelector('.progress-bar-fill');
        const pctEl = this.el.querySelector('.inline-progress-pct');
        const textEl = this.el.querySelector('.inline-progress-text');
        if (fill) fill.style.width = Math.min(100, pct) + '%';
        if (pctEl) pctEl.textContent = Math.round(pct) + '%';
        if (textEl && text) textEl.textContent = text;
    }

    remove() {
        if (this.el && this.el.parentNode) {
            this.el.classList.add('anim-fade-in');
            setTimeout(() => {
                if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
            }, 300);
        }
    }
}

// ==================== SKELETON HELPERS ====================

function showSkeleton(containerId, rows = 4) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < rows; i++) {
        const w = ['', 'short', 'medium', 'tiny'][Math.floor(Math.random() * 4)];
        html += `<div class="skeleton skeleton-text ${w}"></div>`;
    }
    el.innerHTML = html;
}

function showSkeletonCards(containerId, count = 3) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-row">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-text medium"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `;
    }
    el.innerHTML = html;
}

// ==================== LOADER COMPONENTS (HTML generators) ====================

function createSpinner(size = 32, color = null) {
    const s = `width:${size}px;height:${size}px;${color ? `border-top-color:${color};` : ''}`;
    return `<div class="spinner" style="${s}"></div>`;
}

function createDotsWave(count = 5) {
    let dots = '';
    for (let i = 0; i < count; i++) dots += '<span></span>';
    return `<div class="dots-wave">${dots}</div>`;
}

function createRippleLoader() {
    return `<div class="ripple-loader"><span></span><span></span></div>`;
}

function createOrbitLoader() {
    return `
        <div class="orbit-loader">
            <div class="orbit-ring"></div>
            <div class="orbit-ring"></div>
            <div class="orbit-ring"></div>
            <div class="orbit-center"></div>
        </div>
    `;
}

function createBarsLoader() {
    return `<div class="bars-loader"><span></span><span></span><span></span><span></span><span></span></div>`;
}

function createInlineLoader(text = 'Loading...') {
    return `<div class="inline-loader"><span class="mini-spinner"></span>${text}</div>`;
}