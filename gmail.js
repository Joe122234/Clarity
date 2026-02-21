// gmail.js - Gmail OAuth Integration

const CLIENT_ID = window.CLARITY_CONFIG.GMAIL.CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient;
let personalToken = sessionStorage.getItem('personal_gmail_token');
let schoolToken = sessionStorage.getItem('school_gmail_token');

function initGmailGate() {
    if (personalToken && schoolToken) {
        unlockApp();
    } else {
        showModal();
    }
}

function initGoogleAuth() {
    if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    if (window.currentAuthTarget === 'personal') {
                        sessionStorage.setItem('personal_gmail_token', tokenResponse.access_token);
                        personalToken = tokenResponse.access_token;
                        const btn = document.getElementById('btn-connect-personal');
                        if (btn) {
                            btn.textContent = 'Connected';
                            btn.disabled = true;
                        }
                    } else if (window.currentAuthTarget === 'school') {
                        sessionStorage.setItem('school_gmail_token', tokenResponse.access_token);
                        schoolToken = tokenResponse.access_token;
                        const btn = document.getElementById('btn-connect-school');
                        if (btn) {
                            btn.textContent = 'Connected';
                            btn.disabled = true;
                        }
                    }
                    checkTokens();
                }
            },
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnPersonal = document.getElementById('btn-connect-personal');
    const btnSchool = document.getElementById('btn-connect-school');

    if (btnPersonal) {
        btnPersonal.addEventListener('click', () => {
            if (!tokenClient) initGoogleAuth();
            window.currentAuthTarget = 'personal';
            if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    if (btnSchool) {
        btnSchool.addEventListener('click', () => {
            if (!tokenClient) initGoogleAuth();
            window.currentAuthTarget = 'school';
            if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }
});

function checkTokens() {
    if (personalToken && schoolToken) {
        unlockApp();
    }
}

function showModal() {
    const modal = document.getElementById('gmail-auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
    }

    document.getElementById('sidebar')?.classList.add('app-blur');
    document.getElementById('main-content')?.classList.add('app-blur');

    if (personalToken) {
        const btnP = document.getElementById('btn-connect-personal');
        if (btnP) { btnP.textContent = 'Connected'; btnP.disabled = true; }
    }
    if (schoolToken) {
        const btnS = document.getElementById('btn-connect-school');
        if (btnS) { btnS.textContent = 'Connected'; btnS.disabled = true; }
    }
}

function unlockApp() {
    const modal = document.getElementById('gmail-auth-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    document.getElementById('sidebar')?.classList.remove('app-blur');
    document.getElementById('main-content')?.classList.remove('app-blur');

    document.dispatchEvent(new Event('gmailUnlocked'));
}

async function fetchRecentEmails(token, accountName) {
    if (!token) return [];
    try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:1d', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
            console.warn(`Token expired for ${accountName}`);
            return [];
        }

        if (!response.ok) throw new Error(`Failed to fetch short list (${accountName})`);

        const data = await response.json();
        if (!data.messages) return [];

        const fullMessages = await Promise.all(
            data.messages.map(msg => fetchFullMessage(token, msg.id, accountName))
        );

        return fullMessages.filter(Boolean);
    } catch (e) {
        console.error(`Error fetching recent emails for ${accountName}:`, e);
        return [];
    }
}

async function fetchFullMessage(token, messageId, accountName) {
    try {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return null;
        const msg = await response.json();

        const headers = msg.payload?.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');

        return {
            account: accountName,
            id: msg.id,
            from: fromHeader ? fromHeader.value : 'Unknown',
            subject: subjectHeader ? subjectHeader.value : 'No Subject',
            snippet: msg.snippet || '',
            internalDate: parseInt(msg.internalDate, 10)
        };
    } catch (e) {
        console.error(`Error fetching full message ${messageId}:`, e);
        return null;
    }
}

async function fetchAllRecentEmails() {
    const pToken = sessionStorage.getItem('personal_gmail_token');
    const sToken = sessionStorage.getItem('school_gmail_token');

    if (!pToken || !sToken) {
        console.warn('Missing tokens. Both accounts required to fetch emails.');
        return [];
    }

    const [personalEmails, schoolEmails] = await Promise.all([
        fetchRecentEmails(pToken, 'personal'),
        fetchRecentEmails(sToken, 'school')
    ]);

    const merged = [...personalEmails, ...schoolEmails];

    // Sort descending by internalDate
    merged.sort((a, b) => b.internalDate - a.internalDate);

    return merged;
}
