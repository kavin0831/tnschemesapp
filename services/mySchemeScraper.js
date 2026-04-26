/**
 * MyScheme Scraper Service (Optimized for 4000+ schemes)
 * Targets rules.myscheme.in for a comprehensive list of all schemes
 */

const puppeteer = require('puppeteer-core');

let browser = null;
let cachedMySchemes = null;
let lastFetchTime = 0;
let isInitializing = false;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache

async function initBrowser() {
    if (!browser) {
        try {
            if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                const chromium = require('@sparticuz/chromium');
                browser = await puppeteer.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless,
                    ignoreHTTPSErrors: true,
                });
                console.log('[Puppeteer] Launched on Vercel');
            } else {
                const localPuppeteer = require('puppeteer');
                browser = await localPuppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                console.log('[Puppeteer] Launched locally');
            }
        } catch (e) {
            console.error('[Puppeteer] Launch failed:', e.message);
            throw e;
        }
    }
    return browser;
}

async function getMySchemes() {
    // Live Scraping Requested - Bypassing Cache
    /* if (cachedMySchemes && (Date.now() - lastFetchTime) < CACHE_DURATION) {
        console.log(`[MyScheme] ⚡ Returning ${cachedMySchemes.length} cached schemes (instant)`);
        return cachedMySchemes;
    } */

    if (isInitializing) {
        console.log('[MyScheme] Already fetching, waiting...');
        while (isInitializing) {
            await new Promise(r => setTimeout(r, 500));
        }
        return cachedMySchemes || [];
    }

    isInitializing = true;
    console.log('[MyScheme] Fetching ALL schemes from rules.myscheme.in...');

    try {
        const browserInstance = await initBrowser();
        const page = await browserInstance.newPage();

        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto('https://rules.myscheme.in/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForSelector('table tbody tr', { timeout: 30000 });

        const schemes = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('table tbody tr');

            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length >= 3) {
                    const title = cols[1].textContent
                        ?.replace(/\n/g, ' ')
                        ?.replace('Check Eligibility', '')
                        ?.trim();
                    const link = cols[2].querySelector('a')?.href;
                    if (title && link) {
                        results.push({
                            title,
                            url: link,
                            source: 'MyScheme'
                        });
                    }
                }
            });
            return results;
        });

        await page.close();

        cachedMySchemes = schemes;
        lastFetchTime = Date.now();
        isInitializing = false;

        console.log(`[MyScheme] ✓ Successfully fetched ${schemes.length} schemes`);
        return schemes;

    } catch (error) {
        console.error('[MyScheme] Error fetching from rules portal:', error.message);
        isInitializing = false;
        return cachedMySchemes || [];
    }
}

/**
 * Fetches detailed eligibility text from a MyScheme page
 */
async function getMySchemeDetails(schemeUrl) {
    console.log(`[MyScheme] Fetching deep details for: ${schemeUrl}`);
    try {
        const browserInstance = await initBrowser();
        const page = await browserInstance.newPage();

        // Block images/styles for speed
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(schemeUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for content
        await new Promise(r => setTimeout(r, 2000));

        const details = await page.evaluate(() => {
            // MyScheme uses tabs. We want "Eligibility" content.
            // But often the text is all in the main container.
            const mainContent = document.querySelector('main')?.innerText || '';
            const eligibilitySection = mainContent.split('Eligibility')[1]?.split('Benefits')[0] || '';
            const benefitsSection = mainContent.split('Benefits')[1]?.split('Documents Required')[0] || '';
            // Capture more context for state detection
            const description = mainContent.substring(0, 3000);

            return {
                eligibility: eligibilitySection.trim(),
                benefits: benefitsSection.trim(),
                description: (eligibilitySection + " " + benefitsSection).trim() || description
            };
        });

        await page.close();
        return details;

    } catch (error) {
        console.error(`[MyScheme] Error fetching details for ${schemeUrl}:`, error.message);
        return { eligibility: '', benefits: '', description: '' };
    }
}

async function preloadSchemes() {
    console.log('[MyScheme] Pre-loading 4000+ schemes at startup...');
    try {
        await getMySchemes();
        console.log('[MyScheme] Pre-load complete!');
    } catch (e) {
        console.log('[MyScheme] Pre-load failed');
    }
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

module.exports = {
    getMySchemes,
    getMySchemeDetails,
    preloadSchemes,
    closeBrowser
};
