const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const crypto = require('crypto');
const puppeteer = require('puppeteer'); // Core requirement now

const client = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        minVersion: 'TLSv1'
    }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
});

// Map of State -> Portal URL
const STATE_PORTALS = {
    "Central Government": "https://en.wikipedia.org/wiki/List_of_schemes_of_the_government_of_India",
    "Andhra Pradesh": "https://en.wikipedia.org/wiki/Category:Government_welfare_schemes_in_Andhra_Pradesh",
    "Arunachal Pradesh": "https://arunachalpradesh.gov.in/",
    "Assam": "https://assam.gov.in/",
    "Bihar": "https://state.bihar.gov.in/main/CitizenHome.html",
    "Chhattisgarh": "https://cgstate.gov.in/en/government-schemes",
    "Goa": "https://www.goa.gov.in/department-services/",
    "Gujarat": "https://www.digitalgujarat.gov.in/Services/CitizenServices.aspx",
    "Haryana": "https://www.haryana.gov.in/schemes/",
    "Himachal Pradesh": "https://himachal.nic.in/en-IN/government-schemes.html",
    "Jharkhand": "https://www.jharkhand.gov.in/schemes",
    "Karnataka": "https://sevasindhu.karnataka.gov.in/Sevasindhu/English",
    "Kerala": "https://en.wikipedia.org/wiki/Category:Government_welfare_schemes_in_Kerala",
    "Madhya Pradesh": "https://www.mp.gov.in/",
    "Maharashtra": "https://en.wikipedia.org/wiki/Category:Government_schemes_in_Maharashtra",
    "Manipur": "https://manipur.gov.in/schemes/",
    "Meghalaya": "https://meghalaya.gov.in/schemes",
    "Mizoram": "https://mizoram.gov.in/schemes",
    "Nagaland": "https://nagaland.gov.in/schemes",
    "Odisha": "https://en.wikipedia.org/wiki/List_of_schemes_of_the_government_of_Odisha", // Explicit list found
    "Punjab": "https://punjab.gov.in/schemes-services/",
    "Rajasthan": "https://rajasthan.gov.in/Schemes/",
    "Sikkim": "https://sikkim.gov.in/schemes",
    "Tamil Nadu": "https://en.wikipedia.org/wiki/Category:Government_welfare_schemes_in_Tamil_Nadu",
    "Telangana": "https://en.wikipedia.org/wiki/Category:Government_schemes_in_Telangana", // Switching to Wiki Category
    "Tripura": "https://tripura.gov.in/scheme-view",
    "Uttar Pradesh": "https://en.wikipedia.org/wiki/Category:Government_schemes_in_Uttar_Pradesh",
    "Uttarakhand": "https://uk.gov.in/pages/display/117-schemes",
    "West Bengal": "https://en.wikipedia.org/wiki/Category:Government_schemes_in_West_Bengal" // Switching to Wiki Category
};

// States requiring Puppeteer (Dynamic/Hard)
const PUPPETEER_STATES = ["Gujarat"];

// Heuristic Keywords
const SCHEME_KEYWORDS = ["scheme", "yojana", "kalyan", "mission", "nidhi", "fund", "subsidy", "bima", "pension", "scholarship", "benefit", "assistance", "incentive", "allowance", "seva"];
const EXCLUDE_KEYWORDS = ["download", "pdf", "login", "contact", "tender", "recruitment", "circular", "notification", "act", "rule", "policy", "news", "press", "gallery", "image", "jpg", "png"];

// --- 1. CHEERIO SCRAPER (FAST, STATIC) ---
async function scrapeStaticState(stateName, url) {
    console.log(`[MultiState-Static] Scraping ${stateName} (${url})...`);
    try {
        const { data } = await client.get(url);
        const $ = cheerio.load(data);
        return extractSchemesFromCheerio($, stateName, url);
    } catch (e) {
        console.error(`[MultiState-Static] ${stateName} Failed:`, e.message);
        return [];
    }
}

function extractSchemesFromCheerio($, stateName, baseUrl) {
    const found = [];
    const seen = new Set();

    // Wikipedia Specific Selector
    if (baseUrl.includes('wikipedia.org')) {
        // Strategy 1: Wikitables (List of Schemes page)
        if (baseUrl.includes('List_of_schemes')) {
            $('table.wikitable tr').each((i, row) => {
                const link = $(row).find('th a').first();
                const link2 = $(row).find('td a').first();
                const target = link.length ? link : link2;

                if (target.length) {
                    const title = target.text().trim();
                    const href = target.attr('href');
                    if (title && href && !title.startsWith('[') && !title.includes('User:') && !title.includes('Template:')) {
                        if (!seen.has(title)) {
                            found.push({
                                title: title,
                                url: href.startsWith('http') ? href : `https://en.wikipedia.org${href}`,
                                state: stateName,
                                source: 'Wikipedia List',
                                type: 'Central'
                            });
                            seen.add(title);
                        }
                    }
                }
            });
            return found;
        }

        // Strategy 2: Category Pages (State Pages)
        $('#mw-pages a').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            if (title && href && !title.includes('User:') && !title.includes('Template:')) {
                found.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://en.wikipedia.org${href}`,
                    state: stateName,
                    source: 'Wikipedia',
                    type: 'Govt'
                });
            }
        });
        return found;
    }

    // Generic Scraper
    $('a').each((i, el) => {
        const title = $(el).text().trim().replace(/\s+/g, ' ');
        const href = $(el).attr('href');

        if (!title || !href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto')) return;
        // Filter by Length
        if (title.length < 5 || title.length > 150) return;

        // Filter by Keywords
        const titleLower = title.toLowerCase();
        const hasKeyword = SCHEME_KEYWORDS.some(k => titleLower.includes(k));
        const isExcluded = EXCLUDE_KEYWORDS.some(k => titleLower.includes(k));

        if (hasKeyword && !isExcluded) {
            if (!seen.has(title)) {
                found.push({
                    title: title,
                    url: href.startsWith('http') ? href : new URL(href, baseUrl).href,
                    state: stateName,
                    source: 'Official Portal',
                    type: 'Govt'
                });
                seen.add(title);
            }
        }
    });
    return found;
}

// --- 2. PUPPETEER SCRAPER (SLOW, DYNAMIC) ---
async function scrapeDynamicState(stateName, url) {
    console.log(`[MultiState-Dynamic] Launching Browser for ${stateName}...`);
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        const page = await browser.newPage();

        // Block heavy resources
        await page.setRequestInterception(true);
        page.on('request', r => ['image', 'font', 'stylesheet'].includes(r.resourceType()) ? r.abort() : r.continue());

        // Handling specific state quirks
        let targetUrl = url;
        if (stateName === 'Maharashtra') {
            // Logic handled inside
        }

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Wait a bit for JS to render lists
        await new Promise(r => setTimeout(r, 5000));

        // MAHARASHTRA SPECIFIC: Switch to English if needed
        if (stateName === 'Maharashtra') {
            try {
                // Click "English" if found
                const enLink = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('English'))?.href;
                });
                if (enLink) {
                    console.log('[MultiState-Dynamic] Switching Maharashtra to English...');
                    await page.goto(enLink, { waitUntil: 'domcontentloaded' });
                    await new Promise(r => setTimeout(r, 3000));
                }
            } catch (e) { }
        }

        // Evaluate in browser context
        const schemes = await page.evaluate((keywords, exclude, state) => {
            const results = [];
            const links = document.querySelectorAll('a');

            links.forEach(el => {
                const title = el.innerText.trim().replace(/\s+/g, ' ');
                const href = el.href;

                if (!title || !href || href.startsWith('javascript')) return;
                if (title.length < 5 || title.length > 200) return;

                const tLower = title.toLowerCase();
                const isMatch = keywords.some(k => tLower.includes(k)) && !exclude.some(k => tLower.includes(k));

                if (isMatch) {
                    results.push({
                        title: title,
                        url: href,
                        state: state,
                        source: 'Official Portal (Dynamic)',
                        type: 'Govt'
                    });
                }
            });
            return results;
        }, SCHEME_KEYWORDS, EXCLUDE_KEYWORDS, stateName);

        console.log(`[MultiState-Dynamic] Found ${schemes.length} schemes for ${stateName}.`);
        return schemes;

    } catch (e) {
        console.error(`[MultiState-Dynamic] ${stateName} Failed:`, e.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeState(stateName) {
    const url = STATE_PORTALS[stateName];
    if (!url) return [];

    // Dispatcher
    if (PUPPETEER_STATES.includes(stateName)) {
        return scrapeDynamicState(stateName, url);
    } else {
        const staticResults = await scrapeStaticState(stateName, url);
        return staticResults;
    }
}

module.exports = { scrapeState, STATE_PORTALS };
