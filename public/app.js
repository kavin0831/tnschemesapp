const form = document.getElementById('eligibility-form');
const formSection = document.getElementById('form-section');
const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const schemesGrid = document.getElementById('schemes-grid');
const backButton = document.getElementById('back-to-form');
const modal = document.getElementById('scheme-modal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');

// Auth DOM Elements
const authContainer = document.getElementById('clerk-auth-container');
const appContainer = document.getElementById('app-container');

// Charts Instances
let sourceChart = null;
let scoreChart = null;
let currentContextScheme = null;

// --- CLERK INITIALIZATION ---
window.addEventListener('load', async () => {
    // 1. Initialize Clerk
    const clerkPublishableKey = document.querySelector('script[data-clerk-publishable-key]').getAttribute('data-clerk-publishable-key');

    if (!clerkPublishableKey || clerkPublishableKey.includes("REPLACE_ME")) {
        console.error("Clerk Publishable Key is missing!");
        return;
    }

    try {
        await window.Clerk.load();
        console.log("Clerk loaded successfully");

        // 2. Monitor session state
        window.Clerk.addListener(({ user }) => {
            if (user) {
                showApp();
                renderUserButton();
            } else {
                // Clear cache on logout
                localStorage.removeItem('tn_scheme_cache');
                // Clear catalog caches
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('tn_cache_')) localStorage.removeItem(k);
                });

                showLogin();
                renderSignIn();
            }
        });

        // 3. Initial state check
        if (window.Clerk.user) {
            showApp();
            renderUserButton();
        } else {
            showLogin();
            renderSignIn();
        }
    } catch (err) {
        console.error('Error loading Clerk:', err);
    }
});

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

function showLogin() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function renderSignIn() {
    const signInDiv = document.getElementById('sign-in');
    try {
        window.Clerk.mountSignIn(signInDiv);
    } catch (err) {
        console.warn('Local UI mount failed, redirecting to hosted sign-in...', err);
        window.Clerk.redirectToSignIn();
    }
}

function renderUserButton() {
    const userButtonDiv = document.getElementById('user-button');
    window.Clerk.mountUserButton(userButtonDiv);
}

// Handle Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect Data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // UI Transitions
    formSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    loadingSection.querySelector('p').textContent = "Scanning 50+ Live Private & Government Databases...";

    try {
        const token = await window.Clerk.session.getToken();

        const response = await fetch('/api/find-schemes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            window.Clerk.openSignIn();
            return;
        }

        if (!response.ok) throw new Error('API Error');

        const result = await response.json();
        const schemes = result.schemes;

        updateDashboard(schemes);
        displaySchemes(schemes);

    } catch (error) {
        console.error(error);
        alert('Failed to process schemes: ' + error.message);
        // Revert UI
        loadingSection.classList.add('hidden');
        formSection.classList.remove('hidden');
    }
});

// Dashboard & Charts Update
function updateDashboard(schemes) {
    const totalCountEl = document.getElementById('total-count');
    if (totalCountEl) {
        totalCountEl.textContent = `${schemes.length} (Top 50)`;
    }

    // 1. Data Processing for Source Chart
    const sourceData = {
        'TN.gov.in': schemes.filter(s => s.source === 'TN.gov.in').length,
        'MyScheme': schemes.filter(s => s.source === 'MyScheme').length,
        'Private': schemes.filter(s => s.type === 'Private').length
    };

    // 2. Data Processing for Score Chart
    const scoreRanges = {
        'Excellent (80+)': schemes.filter(s => s.score >= 80).length,
        'Good (60-80)': schemes.filter(s => s.score >= 60 && s.score < 80).length,
        'Average (<60)': schemes.filter(s => s.score < 60).length
    };

    // 3. Render Source Chart
    const ctxSource = document.getElementById('sourceChart').getContext('2d');
    if (sourceChart) sourceChart.destroy();

    sourceChart = new Chart(ctxSource, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sourceData),
            datasets: [{
                data: Object.values(sourceData),
                backgroundColor: ['#0062ff', '#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { weight: '600' } }
                }
            }
        }
    });

    // 4. Render Score Chart
    const ctxScore = document.getElementById('scoreChart').getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctxScore, {
        type: 'bar',
        data: {
            labels: Object.keys(scoreRanges),
            datasets: [{
                label: 'Schemes',
                data: Object.values(scoreRanges),
                backgroundColor: '#0062ff',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { weight: '600' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { weight: '600' } }
                }
            }
        }
    });
}

// Display Results
function displaySchemes(schemes) {
    loadingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    schemesGrid.innerHTML = '';

    if (schemes.length === 0) {
        schemesGrid.innerHTML = '<p>No specific schemes found matching your profile. Check general citizen schemes.</p>';
        return;
    }

    schemes.forEach((scheme, index) => {
        const card = document.createElement('div');
        card.className = 'scheme-card animated fadeIn';

        // Category Icons
        const icons = { 'STUDENTS': '🎓', 'FARMERS': '🌾', 'UNEMPLOYMENT': '💼', 'SC_ST': '🤝', 'PENSIONS': '👴', 'GENERAL': 'ℹ️' };
        const icon = icons[scheme.category] || '📁';

        // Using badge-govt / badge-private for source badges too since bg-tn might be missing
        const typeBadge = `<span class="badge ${scheme.type === 'Private' ? 'badge-private' : 'badge-govt'}">${scheme.type}</span>`;
        const sourceBadge = `<span class="badge ${scheme.source === 'TN.gov.in' ? 'badge-govt' : 'badge-private'}">${scheme.source}</span>`;
        const scoreBadge = `<span class="score-badge">${scheme.score}% Match</span>`;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-badges">
                    <div class="type-row">${typeBadge} ${sourceBadge}</div>
                    ${scoreBadge}
                </div>
                <h3>${icon} ${scheme.title}</h3>
            </div>
            <div class="card-body">
                <p class="scheme-excerpt">Matches your profile based on keywords and rules. Click below for deep eligibility analysis.</p>
            </div>
            <div class="card-footer">
                <div class="card-actions">
                    <button class="btn btn-secondary view-details-btn" data-index="${index}">
                        🔍 View Details
                    </button>
                    <button class="btn btn-secondary ask-ai-btn" data-index="${index}">
                        💬 Ask AI
                    </button>
                    <a href="${scheme.url}" target="_blank" class="btn btn-apply">🚀 Official Portal</a>
                </div>
            </div>
        `;
        schemesGrid.appendChild(card);
    });

    // Handle View Details (On-Demand AI)
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = btn.getAttribute('data-index');
            const scheme = schemes[index];

            // 1. Open Modal & Set Title
            modalTitle.textContent = scheme.title;
            modalBody.innerHTML = `
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <p>Fetching deep details from ${scheme.source}...</p>
                    <small>Expert system is analyzing criteria...</small>
                </div>
            `;
            modal.classList.remove('hidden');

            try {
                const token = await window.Clerk.session.getToken();
                const response = await fetch('/api/enrich-scheme', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        url: scheme.url,
                        source: scheme.source,
                        title: scheme.title
                    })
                });

                const data = await response.json();

                // 2. Render Result
                modalBody.innerHTML = `
                    <div class="ai-report animated fadeIn">
                        <div class="report-section">
                            <h4>📍 ELIGIBILITY</h4>
                            <p>${data.eligibility}</p>
                        </div>
                        <div class="report-section">
                            <h4>ℹ️ DETAILS & BENEFITS</h4>
                            <p>${data.details}</p>
                        </div>
                        <div class="report-footer">
                            <p>Analysis generated based on official portal data.</p>
                        </div>
                    </div>
                `;
            } catch (err) {
                modalBody.innerHTML = `<p class="error">Failed to fetch details. Please check the <a href="${scheme.url}" target="_blank">official portal</a>.</p>`;
            }
        });
    });

    // Handle Ask AI Button
    document.querySelectorAll('.ask-ai-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = btn.getAttribute('data-index');
            const scheme = schemes[index];

            // Set context and open chat modal
            currentContextScheme = scheme;
            chatModal.classList.remove('hidden');

            // Clear previous messages and show initial AI analysis
            chatMessages.innerHTML = `<div class="ai-message"><strong>AI Assistant:</strong> Analyzing "${scheme.title}"...</div>`;

            // Get AI explanation of why this scheme matches
            try {
                const token = await window.Clerk.session.getToken();
                const response = await fetch('/api/scheme-ai-explain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: scheme.title,
                        score: scheme.score,
                        category: scheme.category,
                        source: scheme.source
                    })
                });

                const data = await response.json();
                chatMessages.innerHTML = `
                    <div class="ai-message">
                        <strong>AI Assistant:</strong><br><br>
                        <strong>📋 About This Scheme:</strong><br>
                        ${data.explanation}<br><br>
                        <strong>💡 Why It Matches You:</strong><br>
                        ${data.relevance}<br><br>
                        Ask me anything about this scheme!
                    </div>
                `;
            } catch (err) {
                chatMessages.innerHTML = `<div class="ai-message"><strong>AI Assistant:</strong> Ready to answer your questions about "${scheme.title}"!</div>`;
            }

            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    });
}

// Modal Logic (Repurposed for Chatbot mostly)
const closeChat = document.querySelector('.close-chat');

closeModal.onclick = () => {
    modal.classList.add('hidden');
};

if (closeChat) {
    closeChat.onclick = () => {
        chatModal.classList.add('hidden');
    };
}

window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
    if (e.target == chatModal) chatModal.classList.add('hidden');
};

// AI Chat Modal Logic
const chatBtn = document.querySelector('.floating-chat-btn');
const chatModal = document.getElementById('ai-chat-modal');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

if (chatBtn) {
    chatBtn.addEventListener('click', () => {
        chatModal.classList.remove('hidden');
        if (chatMessages.innerHTML === '') {
            currentContextScheme = null; // Reset context if opening manually
            chatMessages.innerHTML = '<div class="ai-message"><strong>Assistant:</strong> Hello! Ask me anything about the government schemes found.</div>';
        }
    });
}

if (chatSend) {
    chatSend.addEventListener('click', () => {
        const message = chatInput.value;
        if (!message) return;
        chatMessages.innerHTML += `<div class="user-message"><strong>You:</strong> ${message}</div>`;
        chatInput.value = '';
        triggerAIChat(message, currentContextScheme);
    });
}

// Global AI Trigger
async function triggerAIChat(message, contextScheme = null) {
    const aiResponsePlaceholder = document.createElement('div');
    aiResponsePlaceholder.className = 'ai-message';
    aiResponsePlaceholder.innerHTML = '<strong>Assistant:</strong> <span class="typing-indicator">Analyzing...</span>';
    chatMessages.appendChild(aiResponsePlaceholder);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const token = await window.Clerk.session.getToken();
        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, contextScheme })
        });
        const data = await response.json();
        aiResponsePlaceholder.innerHTML = `<strong>Assistant:</strong> ${formatAIResponse(data.reply)}`;
    } catch (e) {
        aiResponsePlaceholder.innerHTML = `<strong>Assistant:</strong> Error connecting to services.`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Back to Search
backButton.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    formSection.classList.remove('hidden');
});


// ==========================================
// NEW: All Schemes Catalog Logic
// ==========================================

const catalogSection = document.getElementById('catalog-section');
const navHome = document.getElementById('nav-home');
const navCatalog = document.getElementById('nav-catalog');
const catalogGrid = document.getElementById('catalog-grid');
const catalogCount = document.getElementById('catalog-count');

// Tabs & Selectors
const tabBtns = document.querySelectorAll('.tab-btn');
const stateSelectorContainer = document.getElementById('state-selector-container');
const stateSelect = document.getElementById('state-select');
const searchInput = document.getElementById('catalog-search');
const benFilters = document.querySelectorAll('.catalog-sidebar input[name="ben"]');

let currentSection = 'state'; // default
let currentStateFilter = 'Central';
let allSchemesCache = { state: [], central: [], private: [] }; // Cache per section

// Navigation Handlers
navHome.addEventListener('click', () => {
    navHome.classList.add('active');
    navCatalog.classList.remove('active');

    catalogSection.classList.add('hidden');
    // Restore previous state (Form or Results)
    if (resultsSection.querySelector('.schemes-grid').children.length > 0) {
        resultsSection.classList.remove('hidden');
    } else {
        formSection.classList.remove('hidden');
    }
});

navCatalog.addEventListener('click', async () => {
    navCatalog.classList.add('active');
    navHome.classList.remove('active');

    // Hide others
    formSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingSection.classList.add('hidden');

    // Show Catalog
    catalogSection.classList.remove('hidden');

    // Initial Load (State Tab)

    // Check LocalStorage First
    const cacheKey = `tn_cache_${currentSection}_${currentStateFilter}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        console.log('Restoring from LocalStorage:', cacheKey);
        allSchemesCache[currentSection] = JSON.parse(cached);
        renderCatalog(allSchemesCache[currentSection]);
    } else {
        await fetchSchemesForSection();
    }
});

// Tab Click Handler
tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        // UI Update
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Logic Update
        currentSection = btn.getAttribute('data-section');

        // Show/Hide State Selector
        if (currentSection === 'central') {
            stateSelectorContainer.classList.remove('hidden');
        } else {
            stateSelectorContainer.classList.add('hidden');
        }

        // Fetch or Render
        const cacheKey = `tn_cache_${currentSection}_${currentSection === 'central' ? currentStateFilter : 'Central'}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            allSchemesCache[currentSection] = JSON.parse(cached);
            applyFilters(); // Render from cache
        } else if (allSchemesCache[currentSection].length === 0) {
            await fetchSchemesForSection();
        } else {
            // Check if Central state filter changed since last cache? 
            // For simplicity, we just re-render cache or re-fetch if state changed.
            if (currentSection === 'central') {
                // Force fetch if user changed state but cache doesn't match? 
                // We will handle specific state fetch on change event.
                if (currentStateFilter !== 'Central' && allSchemesCache['central_state'] !== currentStateFilter) {
                    await fetchSchemesForSection();
                } else {
                    applyFilters();
                }
            } else {
                applyFilters();
            }
        }
    });
});

// State Dropdown Handler
stateSelect.addEventListener('change', async () => {
    currentStateFilter = stateSelect.value;
    // Clear Central Cache to force refresh with new state
    allSchemesCache['central'] = [];
    // Mark cache with state
    allSchemesCache['central_state'] = currentStateFilter;

    await fetchSchemesForSection();
});

async function fetchSchemesForSection() {
    catalogGrid.innerHTML = '<div class="loader"></div><p style="text-align:center">Fetching official schemes & AI Analysis...</p>';

    try {
        const token = await window.Clerk.session.getToken();

        const payload = {
            section: currentSection,
            state_filter: currentSection === 'central' ? currentStateFilter : null
        };

        const res = await fetch('/api/all-schemes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        // Update Cache (Memory + LocalStorage)
        allSchemesCache[currentSection] = data.schemes;

        // Persist to LocalStorage for speed
        const cacheKey = `tn_cache_${currentSection}_${currentStateFilter}`;
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data.schemes));
        } catch (e) { console.log('Cache full'); }

        applyFilters();

    } catch (err) {
        console.error(err);
        catalogGrid.innerHTML = '<p class="error">Failed to load catalog. Please try again.</p>';
    }
}

// Filter Logic
function setupFilters() {
    searchInput.addEventListener('input', applyFilters);
    benFilters.forEach(el => el.addEventListener('change', applyFilters));
}
setupFilters();

function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const checkedBens = Array.from(benFilters).filter(c => c.checked).map(c => c.value);

    const schemes = allSchemesCache[currentSection] || [];

    const displayedSchemes = schemes.filter(s => {
        // 1. Search
        if (query && !s.title.toLowerCase().includes(query)) return false;

        // 2. Beneficiaries
        if (checkedBens.length > 0) {
            if (!checkedBens.includes(s.category)) return false;
        }

        return true;
    });

    renderCatalog(displayedSchemes);
}

function renderCatalog(displayedSchemes) {
    catalogGrid.innerHTML = '';

    const stateLabel = currentSection === 'central' ? ` (${currentStateFilter})` : '';
    catalogCount.textContent = `${displayedSchemes.length} Schemes Found${stateLabel}`;

    if (displayedSchemes.length === 0) {
        catalogGrid.innerHTML = '<p>No schemes match your filters.</p>';
        return;
    }

    displayedSchemes.forEach((scheme, index) => {
        const card = document.createElement('div');
        card.className = 'scheme-card animated fadeIn';

        const icons = { 'STUDENTS': '🎓', 'FARMERS': '🌾', 'UNEMPLOYMENT': '💼', 'SC_ST': '🤝', 'PENSIONS': '👴', 'GENERAL': 'ℹ️' };
        const icon = icons[scheme.category] || '📁';

        // Use AI Score if available (HIDDEN as per user request)
        let scoreBadge = '';
        // if (scheme.score > 0) {
        //    scoreBadge = `<span class="score-badge" style="background:#10b981">AI Match: ${scheme.score}%</span>`;
        // }

        const typeBadge = `<span class="badge ${scheme.type === 'Private' ? 'badge-private' : 'badge-govt'}">${scheme.type}</span>`;
        const sourceBadge = `<span class="badge badge-govt">${scheme.source || scheme.state || 'MyScheme'}</span>`;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-badges">
                    <div class="type-row">${typeBadge} ${sourceBadge}</div>
                    ${scoreBadge}
                </div>
                <h3>${icon} ${scheme.title}</h3>
            </div>
            <div class="card-body">
                <p class="scheme-excerpt">Click details to see eligibility criteria.</p>
            </div>
            <div class="card-footer">
                <div class="card-actions">
                    <button class="btn btn-secondary catalog-view-btn" data-id="${index}">
                        🔍 View Details
                    </button>
                    <button class="btn btn-secondary catalog-ask-btn" data-id="${index}">
                        💬 Ask AI
                    </button>
                    <a href="${scheme.url}" target="_blank" class="btn btn-apply">🚀 Official</a>
                </div>
            </div>
        `;
        catalogGrid.appendChild(card);
    });

    // Attach Listeners
    document.querySelectorAll('.catalog-view-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = btn.getAttribute('data-id');
            const scheme = displayedSchemes[index];

            // Reuse Modal
            modalTitle.textContent = scheme.title;
            modalBody.innerHTML = `
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <p>Fetching deep details via AI...</p>
                </div>
            `;
            modal.classList.remove('hidden');

            try {
                const token = await window.Clerk.session.getToken();
                const response = await fetch('/api/enrich-scheme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ url: scheme.url, source: scheme.source, title: scheme.title })
                });
                const data = await response.json();
                modalBody.innerHTML = `
                    <div class="ai-report animated fadeIn">
                        <div class="report-section"><h4>📍 ELIGIBILITY</h4><p>${data.eligibility}</p></div>
                        <div class="report-section"><h4>ℹ️ DETAILS</h4><p>${data.details}</p></div>
                    </div>`;
            } catch (err) {
                modalBody.innerHTML = `<p class="error">Failed to fetch details.</p>`;
            }
        });
    });

    document.querySelectorAll('.catalog-ask-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.getAttribute('data-id');
            const scheme = displayedSchemes[index];
            currentContextScheme = scheme;
            chatModal.classList.remove('hidden');
            chatMessages.innerHTML = `<div class="ai-message"><strong>AI Assistant:</strong> Analyzing "${scheme.title}"... Ask me anything!</div>`;
        });
    });
}
// Helper: Simple Markdown Formatter
function formatAIResponse(text) {
    if (!text) return '';

    // 1. Bold: **text** -> <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Lists: - item -> <li>item</li>
    // We need to wrap adjacent li's in ul. pseudo-logic:
    // Replace lines starting with "- " with <li>
    formatted = formatted.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');

    // Wrap <li> groups in <ul> (Multi-line replace hack)
    // simplistic: if content has <li>, wrap the whole thing in <ul> if it's mostly a list?
    // Better: split by double newline, process blocks. 
    // For simplicity in this context, we'll just wrap the huge block if it contains li
    if (formatted.includes('<li>')) {
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        // Note: The above regex is weak for multiple lists. 
        // Let's use a improved regex to wrap contiguous <li> lines
        formatted = formatted.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    }

    // 3. Line breaks: \n -> <br> (but not inside ul)
    // Actually, we can just treat remaining newlines as <br>
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}
