// --- CLERK CONFIGURATION (MUST BE INTIALIZED BEFORE IMPORTS) ---
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_bm90ZWQteWV0aS05NC5jbGVyay5hY2NvdW50cy5kZXYk';
process.env.CLERK_SECRET_KEY = 'sk_test_705K87M5zX5jaYJ5jTpYuWhMBHQlO75Lc90vMkSbBD';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { clerkMiddleware, requireAuth } = require('@clerk/express');

console.log('=== SCHEME FINDER v9.0 - Multi-State & Local AI ===');

const { getAllSchemes, filterSchemesByProfile, getSchemeDetails, CATEGORY_KEYWORDS } = require('./services/scraper');
const { getMySchemes, getMySchemeDetails, preloadSchemes } = require('./services/mySchemeScraper');
const { getPrivateSchemes } = require('./services/privateSchemes');

const { scrapeState } = require('./services/multiStateScraper');
const { rankSchemesAI } = require('./services/rankingEngine');

// Pre-load MyScheme data at startup
preloadSchemes();

const app = express();
const PORT = 3000;
const PYTHON_AI_URL = 'https://kavin08028292002-tnschemes.hf.space/filter_and_score';

const SAMBANOVA_API_KEY = 'c7b1d0ce-36c7-421f-ab6a-5aeed86677e2';
const SAMBANOVA_API_URL = 'https://api.sambanova.ai/v1/chat/completions';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Clerk Middleware
app.use(clerkMiddleware());

// --- API ENDPOINTS ---

// Store context for AI chat
let lastSearchContext = { userProfile: null, schemes: [] };

app.post('/api/find-schemes', requireAuth(), async (req, res) => {
    try {
        const userProfile = req.body;
        console.log('\n--- New Search Request (Clerk Authenticated) ---');

        const [tnSchemes, mySchemes, privateSchemes] = await Promise.all([
            getAllSchemes(),
            getMySchemes().catch(() => []),
            getPrivateSchemes().catch(() => [])
        ]);

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
        res.status(500).json({ error: e.message });
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

app.post('/api/enrich-batch', requireAuth(), async (req, res) => {
    const { batch } = req.body; // Array of { title, description }
    try {
        console.log(`[AI] Batch Enriching ${batch.length} schemes...`);

        const messages = [
            {
                role: 'system',
                content: 'You are an expert for Tamil Nadu government schemes. Provide clear ELIGIBILITY and DETAILS for each scheme.'
            },
            {
                role: 'user',
                content: `Enrich the following ${batch.length} schemes:
        
${batch.map((s, idx) => `${idx + 1}. TITLE: ${s.title}\n   CONTENT: ${s.description || 'Details on portal'}`).join('\n\n')}

Return the results as a STACKED list in the following format:
---
SCHEME: [Title]
ELIGIBILITY: [One clear sentence]
DETAILS: [One clear sentence]
---
(Repeat for all items)`
            }
        ];

        const aiText = await callSambaNova(messages);

        // Parse the block-style response
        const blocks = aiText.split('---').filter(b => b.trim().length > 20);
        const results = batch.map(s => {
            const block = blocks.find(b => b.includes(s.title)) || "";
            const eligibilityMatch = block.match(/ELIGIBILITY:?\s*(.*?)(?=\s*DETAILS:|$)/si);
            const detailsMatch = block.match(/DETAILS:?\s*(.*)/si);

            return {
                title: s.title,
                eligibility: eligibilityMatch ? eligibilityMatch[1].trim() : "Verified based on profile.",
                details: detailsMatch ? detailsMatch[1].trim() : "Check official portal for benefits."
            };
        });

        res.json({ results });
    } catch (e) {
        console.error('Batch Enrichment Error:', e.response?.data || e.message);
        res.status(500).json({ error: "Batch enrichment failed" });
    }
});

app.post('/api/enrich-scheme', requireAuth(), async (req, res) => {
    try {
        const { url, source, title } = req.body;
        console.log(`[AI] Deep Enriching: ${title} (${source})`);

        let context = "";
        try {
            if (source === 'TN.gov.in') {
                const details = await getSchemeDetails(url);
                context = details.description;
            } else if (source === 'MyScheme') {
                const details = await getMySchemeDetails(url);
                context = `${details.description}\nEligibility: ${details.eligibility}\nBenefits: ${details.benefits}`;
            } else {
                // For other official portals, we might not have a deep scraper yet.
                context = "Official government scheme. Check portal for latest updates.";
            }
        } catch (err) {
            console.error("Scraping error:", err.message);
            context = "Details available on the official portal.";
        }

        const messages = [
            {
                role: 'system',
                content: `You are an expert for the government scheme: "${title}".`
            },
            {
                role: 'user',
                content: `Based on these official details: "${context.substring(0, 3000)}..."

Provide Exactly TWO short sections:
ELIGIBILITY: (one clear sentence on who qualifies)
DETAILS: (one clear sentence on benefits or application steps)

Keep it under 60 words total. Use plain, helpful language. Do not use markdown bolding.`
            }
        ];

        const aiText = await callSambaNova(messages);

        const eligibilityMatch = aiText.match(/ELIGIBILITY:?\s*(.*?)(?=\s*DETAILS:|$)/i);
        const detailsMatch = aiText.match(/DETAILS:?\s*(.*)/i);

        const eligibility = eligibilityMatch ? eligibilityMatch[1].trim() : "Refer to official criteria.";
        const details = detailsMatch ? detailsMatch[1].trim() : aiText.substring(0, 100);

        res.json({ eligibility, details });
    } catch (e) {
        console.error('Single Enrichment Error:', e.response?.data || e.message);
        res.json({ eligibility: "Check official portal.", details: "Check official portal." });
    }
});

app.post('/api/scheme-ai-details', requireAuth(), async (req, res) => {
    const { title, description } = req.body;
    try {
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant for government schemes.'
            },
            {
                role: 'user',
                content: `Provide 3 short, actionable bullet points on how to apply for this government scheme: "${title}". 
Description context: ${description}. 
Focus on: Who to contact, what documents are needed, and where to apply. 
Keep it under 100 words total.`
            }
        ];

        const advice = await callSambaNova(messages);
        res.json({ advice });
    } catch (e) {
        res.json({ advice: "Error fetching AI advice." });
    }
});

app.post('/api/scheme-ai-explain', requireAuth(), async (req, res) => {
    const { title, score, category, source } = req.body;
    try {
        const messages = [
            {
                role: 'system',
                content: 'You are an expert explaining government schemes to citizens.'
            },
            {
                role: 'user',
                content: `Scheme: "${title}"
Match Score: ${score}%
Category: ${category}
Source: ${source}

Provide TWO short paragraphs (max 100 words total):
1. EXPLANATION: What this scheme is about and who it helps
2. RELEVANCE: Why this scheme matched the user's profile (based on the ${score}% match score and ${category} category)

Be conversational and helpful. Do not use markdown formatting.`
            }
        ];

        const aiText = await callSambaNova(messages);

        // Split into explanation and relevance
        const parts = aiText.split(/RELEVANCE:|Why it matches/i);
        const explanation = parts[0].replace(/EXPLANATION:/i, '').trim();
        const relevance = parts[1] ? parts[1].trim() : `This scheme has a ${score}% match with your profile in the ${category} category.`;

        res.json({ explanation, relevance });
    } catch (e) {
        console.error('AI Explain Error:', e.response?.data || e.message);
        res.json({
            explanation: `${title} is a ${source} scheme in the ${category} category.`,
            relevance: `This scheme matched your profile with a ${score}% relevance score.`
        });
    }
});

app.post('/api/ai-chat', requireAuth(), async (req, res) => {
    const { message, contextScheme } = req.body;
    try {
        let messages = [];
        if (contextScheme) {
            messages = [
                {
                    role: 'system',
                    content: `You are a specialist for the government scheme: "${contextScheme.title}". Official Website: ${contextScheme.url}`
                },
                {
                    role: 'user',
                    content: message
                }
            ];
        } else {
            const context = lastSearchContext.schemes.slice(0, 5).map(s =>
                `- ${s.title} (Source: ${s.source})`
            ).join('\n');
            messages = [
                {
                    role: 'system',
                    content: `You are an assistant for Government Schemes. Context of recent search:\n${context}`
                },
                {
                    role: 'user',
                    content: message
                }
            ];
        }

        const reply = await callSambaNova(messages);
        res.json({ reply });
    } catch (e) {
        console.error('AI Chat Error:', e.response?.data || e.message);
        res.json({ reply: `Error: ${e.message}` });
    }
});

// NEW: Get All Schemes (for Catalog Page) with Multi-Section Support
app.post('/api/all-schemes', requireAuth(), async (req, res) => {
    const { state_filter, section } = req.body; // section: 'state' (TN), 'central', 'private'

    try {
        console.log(`fetching catalog for section: ${section}, filter: ${state_filter}`);

        let results = [];

        // --- 1. STATE SECTION (TAMIL NADU SPECIFIC) ---
        if (section === 'state') {
            const [tnOfficial, mySchemeData] = await Promise.all([
                getAllSchemes(), // scraper.js (tn.gov.in)
                getMySchemes().catch(() => [])
            ]);

            // Filter MyScheme for TN only
            const mySchemeTN = mySchemeData.filter(s => {
                const t = s.title.toLowerCase();
                return t.includes('tamil nadu') || t.includes('tn ') || t.includes('chennai');
            });

            results = [
                ...tnOfficial.map(s => ({ ...s, source: 'TN.gov.in', type: 'Govt', state: 'Tamil Nadu' })),
                ...mySchemeTN.map(s => ({ ...s, type: 'Govt', state: 'Tamil Nadu' }))
            ];
        }

        // --- 2. CENTRAL / OTHER STATES SECTION ---
        else if (section === 'central') {
            const targetState = state_filter || 'Central';

            // 2a. Fetch Official Portals based on State
            let officialSchemes = [];

            // Use generic scraper for ALL states (uses Wikipedia/Portal logic)
            // This fixes the "same schemes" issue by dynamically fetching the correct state data
            try {
                if (targetState !== 'Central') {
                    officialSchemes = await scrapeState(targetState);
                } else {
                    // Special case for Central - fetch the Central List
                    officialSchemes = await scrapeState("Central Government");
                }
            } catch (err) {
                console.error(`Failed to scrape ${targetState}:`, err.message);
            }

            // 2b. Fetch MyScheme Data
            const mySchemeData = await getMySchemes().catch(() => []);

            // 2c. ADVANCED FILTERING & DEDUPLICATION WITH STRICT STATE EXCLUSION

            const target = targetState.toLowerCase();
            const stateKeywords = [target];

            // Add variations
            if (target === 'tamil nadu') stateKeywords.push('tn', 'tamil');
            else if (target === 'uttar pradesh') stateKeywords.push('up ', 'uttar');
            else if (target === 'andhra pradesh') stateKeywords.push('andhra', 'ap ');
            else if (target === 'madhya pradesh') stateKeywords.push('mp ', 'madhya');
            else if (target === 'himachal pradesh') stateKeywords.push('himachal', 'hp ');
            else if (target === 'west bengal') stateKeywords.push('wb ', 'bengal');
            else if (target === 'jammu and kashmir') stateKeywords.push('j&k', 'jammu');

            // GLOBAL STATE LIST to prevent "Bihar" schemes appearing in "Sikkim"
            const ALL_STATES = [
                "andhra", "arunachal", "assam", "bihar", "chandigarh", "chhattisgarh",
                "delhi", "goa", "gujarat", "haryana", "himachal", "jammu", "jharkhand",
                "karnataka", "kerala", "ladakh", "lakshadweep", "madhya", "maharashtra",
                "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "puducherry",
                "punjab", "rajasthan", "sikkim", "tamil", "telangana", "tripura",
                "uttar", "uttarakhand", "bengal"
            ];

            // Identify other states to EXCLUDE (Negative Lookahead)
            // If I am looking for "Sikkim", I must strictly exclude "Bihar", "Goa", etc.
            const otherStates = ALL_STATES.filter(s => !stateKeywords.some(k => k.includes(s) || s.includes(k)));

            // Set of normalized titles from Official Source to check duplicates
            const officialTitles = new Set(officialSchemes.map(s => s.title.toLowerCase().replace(/[^a-z0-9]/g, '')));

            const relevantMySchemes = mySchemeData.filter(s => {
                const t = s.title.toLowerCase();
                const tClean = t.replace(/[^a-z0-9]/g, '');

                // 1. Check for Duplicate
                if (officialTitles.has(tClean)) return false;

                // 2. CRITICAL: NEGATIVE FILTER (Exclude other states)
                // If title contains "Bihar" but we are looking for "Goa", REJECT.
                if (otherStates.some(os => t.includes(os))) {
                    // console.log(`[Filter] Rejected "${s.title}" because it matches other state`);
                    return false;
                }

                // 3. Match State (Positive Filter)
                if (stateKeywords.some(k => t.includes(k))) return true;

                // 4. Match Central (Mixed pool)
                // Only if it passed the negative filter (so it's a "clean" Central scheme)
                if (t.includes('central') || t.includes('pradhan') || t.includes('india') || t.includes('national')) return true;

                return false;
            }).map(s => ({
                ...s,
                source: 'MyScheme',
                type: 'Govt',
                state: targetState,
                priority: stateKeywords.some(k => s.title.toLowerCase().includes(k)) ? 100 : 50
            }));

            // Sort by priority (State specific first)
            relevantMySchemes.sort((a, b) => b.priority - a.priority);

            // 2d. Merge & FINAL CLEANUP
            // Apply the same strict state rejection to Official sources too
            const allInitial = [
                ...officialSchemes.map(s => ({ ...s, type: 'Govt', source: s.source || 'Official Portal' })),
                ...relevantMySchemes
            ];

            let candidates = allInitial.filter(s => {
                const t = s.title.toLowerCase();
                // We ALREADY filtered MySchemes, but let's be double sure for Official ones
                if (otherStates.some(os => t.includes(os))) {
                    // One exception: If it's a "Central" scheme that just happens to mention another state 
                    // in a generic way? Risky. Let's stay strict.
                    if (!stateKeywords.some(k => t.includes(k))) return false;
                }
                return true;
            });

            // EXPLICIT SORT: Force Official Portal schemes to the top
            candidates.sort((a, b) => {
                const sourceA = a.source === 'MyScheme' ? 1 : 0;
                const sourceB = b.source === 'MyScheme' ? 1 : 0;
                return sourceA - sourceB;
            });

            // 2e. PYTHON AI FILTERING
            // The user explicitly requested better accuracy using the AI model.
            // We filter out noise first, then send to Python.

            const NOISE_TITLES = [
                "this list may not reflect recent changes",
                "government schemes in india",
                "list of government schemes",
                "category:",
                "template:",
                "wikipedia",
                "edit",
                "history",
                "talk",
                "portal",
                "search"
            ];

            // Pre-clean candidates
            let cleanCandidates = candidates.filter(s => {
                const t = s.title.toLowerCase();
                if (NOISE_TITLES.some(n => t.includes(n))) return false;
                if (t.length < 5) return false; // Too short
                return true;
            });

            try {
                console.log(`[Python AI] Sending ${cleanCandidates.length} schemes to AI for filtering...`);

                const pyRes = await axios.post(PYTHON_AI_URL, {
                    schemes: cleanCandidates,
                    state: targetState
                }, { timeout: 15000 }); // increased timeout

                results = pyRes.data.results;
                console.log(`[Python AI] Success! Filtered to ${results.length} relevant schemes`);

                // Fallback sort if Python didn't sort specific way? 
                // We trust Python to return relevant ones, but let's re-enforce source ordering
                results.sort((a, b) => {
                    const sourceA = a.source === 'MyScheme' ? 1 : 0;
                    const sourceB = b.source === 'MyScheme' ? 1 : 0;
                    return sourceA - sourceB;
                });

            } catch (pyErr) {
                console.error("Python AI Service Failed (Fallback to local strict filter):", pyErr.message);
                // Fallback: Use the candidates we already prepared with strict local logic
                results = cleanCandidates;
            }
        }

        // --- 3. PRIVATE SECTION ---
        else if (section === 'private') {
            results = await getPrivateSchemes().catch(() => []);
        }

        // Add auto-categorization for display
        const inferCategory = (title, defaultCat = 'GENERAL') => {
            const t = (title || "").toUpperCase();
            if (t.includes('FARM') || t.includes('AGRI')) return 'FARMERS';
            if (t.includes('STUDENT') || t.includes('SCHOLARSHIP') || t.includes('EDUCATION')) return 'STUDENTS';
            if (t.includes('WOMEN') || t.includes('GIRL') || t.includes('WIDOW')) return 'WOMEN';
            if (t.includes('UNEMPLOY') || t.includes('JOB') || t.includes('TRAINING')) return 'UNEMPLOYMENT';
            if (t.includes('SC/') || t.includes('ST/') || t.includes('ADIVASI') || t.includes('TRIBAL')) return 'SC_ST';
            if (t.includes('PENSION') || t.includes('SENIOR')) return 'PENSIONS';
            return defaultCat;
        };

        results = results.map(s => ({
            ...s,
            category: s.category || inferCategory(s.title),
            score: s.ai_score || 0 // Use Python AI score if available
        }));

        res.json({
            success: true,
            count: results.length,
            schemes: results
        });

    } catch (error) {
        console.error('Catalog processing error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog' });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
