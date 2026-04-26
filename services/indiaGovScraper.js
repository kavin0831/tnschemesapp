const puppeteer = require('puppeteer');

async function scrapeIndiaGov(targetState) {
    console.log(`[IndiaGov] Launching Browser to scrape for ${targetState}...`);

    // Launch options
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();

        // Optimizations
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const url = 'https://www.india.gov.in/my-government/schemes/search';
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('[IndiaGov] Page loaded. Looking for State Dropdown...');

        // Wait for the dropdown (Select2 or standard select)
        // Inspecting india.gov.in source usually shows a select with ID or name
        // Often 'edit-beneficiary-state' or similar if Drupal.
        // Let's try to detect the select element for states.

        // Try to identify the select by text content or label if ID is dynamic, 
        // but typically Drupal IDs are stable-ish like '#edit-beneficiary-state'

        // Let's dump available selects for debug if we fail, but try standard first
        const selectSelector = 'select[name="beneficiaryState"]';
        // Note: URL param was beneficiaryState, so input name is likely same.

        await page.waitForSelector(selectSelector, { timeout: 10000 }).catch(() => console.log('Select not found instantly'));

        // Handle Select2 if present, otherwise standard select
        const isSelect2 = await page.$('.select2-container');

        if (false) {
            // Placeholder for Select2 logic if needed
        } else {
            // Standard Select
            // We need to find the "value" for the state text.
            const stateValue = await page.evaluate((stateName, selector) => {
                const sel = document.querySelector(selector);
                if (!sel) return null;

                for (let opt of sel.options) {
                    if (opt.text.toLowerCase().includes(stateName.toLowerCase())) {
                        return opt.value;
                    }
                }
                return null;
            }, targetState, selectSelector);

            if (stateValue) {
                console.log(`[IndiaGov] Found ID for ${targetState}: ${stateValue}. Selecting...`);
                await page.select(selectSelector, stateValue);

                // Click Apply/Search
                // Usually '#edit-submit-search-schemes' or similar
                const submitSelector = 'input[type="submit"], button[type="submit"]';
                await page.click(submitSelector);

                console.log('[IndiaGov] Search clicked. Waiting for results...');
                await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            } else {
                console.log(`[IndiaGov] Could not find option for state: ${targetState}`);
                // Try direct URL fallback if UI fails? 
                // No, user request implies URL method failed.
            }
        }

        // Scrape Results
        // View rows
        await page.waitForSelector('.views-row', { timeout: 5000 }).catch(() => console.log('No .views-row found'));

        const schemes = await page.evaluate((tgtState) => {
            const items = [];
            const rows = document.querySelectorAll('.views-row');

            rows.forEach(row => {
                const titleEl = row.querySelector('.views-field-title a');
                const contentEl = row.querySelector('.views-field-body');

                if (titleEl) {
                    items.push({
                        title: titleEl.innerText.trim(),
                        url: titleEl.href,
                        state: tgtState,
                        source: 'India.gov.in',
                        type: 'Govt',
                        description: contentEl ? contentEl.innerText.trim() : ''
                    });
                }
            });
            return items;
        }, targetState);

        console.log(`[IndiaGov] Found ${schemes.length} schemes.`);
        return schemes;

    } catch (e) {
        console.error('[IndiaGov] Error:', e.message);
        return [];
    } finally {
        await browser.close();
    }
}

// debug
// scrapeIndiaGov('Andhra Pradesh').then(console.log);

module.exports = { scrapeIndiaGov };
