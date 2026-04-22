// ===========================
// AUTH.JS — Authentication
// ===========================

async function signIn() {
    try {
        await puter.auth.signIn();
        toast('Signed in!', 'success');
        checkAuth();
    } catch (e) {
        toast('Sign in error: ' + e.message, 'error');
    }
}

async function checkAuth() {
    const grid = document.getElementById('profile-grid');
    try {
        const user = await puter.auth.getUser();
        if (user) {
            grid.innerHTML = `
                <div style="text-align:center; margin-bottom:16px;">
                    <div class="profile-avatar-lg">👤</div>
                    <h3 style="margin-top:8px;">${user.username || 'User'}</h3>
                    <span class="text-muted">${user.email || ''}</span>
                </div>
                ${profileRow('Username', user.username)}
                ${profileRow('Email', user.email || '—')}
                ${profileRow('UUID', user.uuid || '—')}
                ${profileRow('Email Confirmed', user.email_confirmed ? '✅ Yes' : '❌ No')}
                ${profileRow('Is Temp', user.is_temp ? '⚠️ Temporary' : '✅ Permanent')}
                ${profileRow('Requires Email', user.requires_email_confirmation ? 'Yes' : 'No')}
            `;
            // Update sidebar
            const sidebarName = document.getElementById('sidebar-username');
            if (sidebarName) sidebarName.textContent = user.username;
        } else {
            grid.innerHTML = `<div class="profile-placeholder"><div class="profile-avatar-lg">👤</div><p class="text-muted">Not signed in</p></div>`;
        }
    } catch (e) {
        grid.innerHTML = `<div class="profile-placeholder"><p class="text-muted">Error: ${e.message}</p></div>`;
    }
}

function profileRow(label, value) {
    return `<div class="profile-row"><span class="label">${label}</span><span class="value">${value || '—'}</span></div>`;
}

async function signOut() {
    try {
        await puter.auth.signOut();
        toast('Signed out', 'info');
        const grid = document.getElementById('profile-grid');
        grid.innerHTML = `<div class="profile-placeholder"><div class="profile-avatar-lg">👤</div><p class="text-muted">Signed out</p></div>`;
        const sidebarName = document.getElementById('sidebar-username');
        if (sidebarName) sidebarName.textContent = 'Guest';
    } catch (e) {
        toast('Error: ' + e.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', checkAuth);