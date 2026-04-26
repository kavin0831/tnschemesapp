const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
// const { clerkMiddleware, requireAuth } = require('@clerk/express'); // DISABLED FOR DEBUG

console.log('=== SCHEME FINDER DEBUG SERVER ===');

const { getAllSchemes, filterSchemesByProfile, getSchemeDetails, CATEGORY_KEYWORDS } = require('./services/scraper');
const { getMySchemes, getMySchemeDetails, preloadSchemes } = require('./services/mySchemeScraper');
const { getPrivateSchemes } = require('./services/privateSchemes');
const { rankSchemesAI } = require('./services/rankingEngine');

// Pre-load MyScheme data at startup
preloadSchemes();

const app = express();
const PORT = 3001; // CHANGED PORT

const SAMBANOVA_API_KEY = '2ddaa116-b04d-4a4b-bd99-f4467e611947';
const SAMBANOVA_API_URL = 'https://api.sambanova.ai/v1/chat/completions';

// --- CLERK CONFIGURATION ---
// process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_...';
// process.env.CLERK_SECRET_KEY = 'sk_test_...';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Clerk Middleware
// app.use(clerkMiddleware()); // DISABLED

// --- API ENDPOINTS ---

// Store context for AI chat
let lastSearchContext = { userProfile: null, schemes: [] };

// REMOVED requireAuth()
app.post('/api/find-schemes', async (req, res) => {
    try {
        const userProfile = req.body;
        console.log('\n--- New Search Request (DEBUG MODE) ---');
        console.log('Profile:', JSON.stringify(userProfile, null, 2));

        const [tnSchemes, mySchemes, privateSchemes] = await Promise.all([
            getAllSchemes(),
            getMySchemes().catch(e => { console.error('MySchemes Error:', e.message); return []; }),
            getPrivateSchemes().catch(e => { console.error('PrivateSchemes Error:', e.message); return []; })
        ]);

        console.log(`Fetched: TN=${tnSchemes.length}, MyScheme=${mySchemes.length}, Private=${privateSchemes.length}`);

        // Tag and Merge
        const tnWithTags = tnSchemes.map(s => ({ ...s, source: 'TN.gov.in', type: 'Govt' }));
        const myWithTags = mySchemes.map(s => ({ ...s, type: 'Govt' })); // MyScheme is always Govt
        const pWithTags = privateSchemes.map(s => ({ ...s, type: 'Private' }));

        // Filter and Rank
        const filteredGovt = filterSchemesByProfile([...tnWithTags, ...myWithTags], userProfile);
        const filteredPrivate = filterSchemesByProfile(pWithTags, userProfile);

        // Sorting/Ranking (Simplified for speed, AI rank later if needed)
        const rankedGovt = rankSchemesAI(userProfile, filteredGovt);
        const rankedPrivate = rankSchemesAI(userProfile, filteredPrivate);

        // --- PRIORITY MERGING ---
        // 1. Ensure at least 15 TN.gov.in schemes (User request)
        const tnOnly = rankedGovt.filter(s => s.source === 'TN.gov.in');
        const topTN = tnOnly.slice(0, 15);

        // 2. Ensure at least 15 Private schemes (Target goal)
        const topPrivate = rankedPrivate.slice(0, 15);

        // 3. Collect remaining candidates (excluding those already taken)
        const takenUrls = new Set([...topTN, ...topPrivate].map(s => s.url));
        const remainingCandidates = [
            ...rankedGovt.filter(s => !takenUrls.has(s.url)),
            ...rankedPrivate.filter(s => !takenUrls.has(s.url))
        ].sort((a, b) => (b.score || 0) - (a.score || 0));

        // 4. Fill up to 50
        const fillSlots = 50 - (topTN.length + topPrivate.length);
        const filled = remainingCandidates.slice(0, Math.max(0, fillSlots));

        const final = [...topTN, ...topPrivate, ...filled];
        console.log(`Final Pool: ${topTN.length} TN + ${topPrivate.length} Private + ${filled.length} Mixed = ${final.length}`);

        lastSearchContext = { userProfile, schemes: final };

        res.json({
            count: final.length,
            schemes: final
        });

    } catch (e) {
        console.error("CRITICAL API ERROR:", e); // Expanded logging
        console.error(e.stack);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// Helper: Call SambaNova API with retry logic
async function callSambaNova(messages, maxRetries = 3) {
    let delay = 2000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.post(SAMBANOVA_API_URL, {
                model: 'gpt-oss-120b',
                messages: messages,
                stream: false,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.data.choices[0].message.content;
        } catch (e) {
            console.error(`[SambaNova] Attempt ${i + 1} failed:`, e.response?.data || e.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw e;
            }
        }
    }
}

app.post('/api/enrich-batch', async (req, res) => {
    const { batch } = req.body; // Array of { title, description }
    try {
        console.log(`[AI] Batch Enriching ${batch.length} schemes...`);
        // ... (rest of logic same but simplified for check)
        res.json({ results: [] });
    } catch (e) {
        res.status(500).json({ error: "Batch enrichment failed" });
    }
});

app.listen(PORT, () => {
    console.log(`DEBUG Server running at http://localhost:${PORT}`);
});
