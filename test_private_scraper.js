const puppeteer = require('puppeteer');

async function testPrivateScraper() {
    console.log('--- Probing Private Schemes (Buddy4Study TN) ---');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const targetUrl = 'https://www.buddy4study.com/scholarships/tamil-nadu';
        console.log(`Navigating to: ${targetUrl}`);

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Page reached networkidle2. Analyzing structure...');

        // Diagnostic: Log all potentially relevant elements
        const discovery = await page.evaluate(() => {
            const results = [];
            // Look for any elements that look like cards or list items
            const potentialItems = document.querySelectorAll('article, section, div[class*="card"], div[class*="ListItem"], div[class*="item"]');

            potentialItems.forEach(el => {
                const text = el.innerText.substring(0, 100).replace(/\n/g, ' ');
                const className = el.className;
                if (text.toLowerCase().includes('scholarship')) {
                    results.push({ className, text });
                }
            });
            return results.slice(0, 10);
        });

        console.log('Potential elements found:', discovery.length);
        discovery.forEach((d, i) => console.log(`${i + 1}. [${d.className}] ${d.text}...`));

        // Actual Extraction attempt with very broad selectors
        const schemes = await page.evaluate(() => {
            const items = [];
            // Try to find headings that might be scholarship titles
            const headings = document.querySelectorAll('h2, h3, h4');

            headings.forEach(h => {
                const title = h.innerText.trim();
                const container = h.closest('div, article, section');
                const link = container?.querySelector('a')?.href;

                if (title && link && title.toLowerCase().includes('scholarship') && title.length > 15) {
                    let org = 'Private Organization';
                    const text = container ? container.innerText.toLowerCase() : title.toLowerCase();
                    if (text.includes('tata')) org = 'Tata';
                    else if (text.includes('reliance')) org = 'Reliance';
                    else if (text.includes('hdfc')) org = 'HDFC';
                    else if (text.includes('mahindra')) org = 'Mahindra';
                    else if (text.includes('lic')) org = 'LIC';

                    items.push({ title, url: link, organization: org });
                }
            });
            return items;
        });

        const uniqueSchemes = Array.from(new Set(schemes.map(s => s.url)))
            .map(url => schemes.find(s => s.url === url));

        console.log(`✓ Found ${uniqueSchemes.length} private schemes:`);
        uniqueSchemes.slice(0, 15).forEach((s, i) => console.log(`${i + 1}. [${s.organization}] ${s.title}`));

    } catch (e) {
        console.error('Error during probe:', e.message);
    } finally {
        await browser.close();
    }
}

testPrivateScraper();
