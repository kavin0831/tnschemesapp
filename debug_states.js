const puppeteer = require('puppeteer');

async function debugState(url, name) {
    console.log(`Debug Scrape: ${name} -> ${url}`);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000)); // Wait for render

        // Screenshot
        await page.screenshot({ path: `${name}_debug.png`, fullPage: true });
        console.log(`Saved screenshot: ${name}_debug.png`);

        // Dump links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({ text: a.innerText.trim(), href: a.href }))
                .filter(a => a.text.length > 0 && a.href.startsWith('http'))
                .slice(0, 10);
        });
        console.log('Top 10 Links:', links);

    } catch (e) {
        console.error('Error:', e.message);
    }

    await browser.close();
}

(async () => {
    await debugState('https://up.gov.in/en/page/schemes', 'UP');
    await debugState('https://www.maharashtra.gov.in/', 'Maharashtra');
})();
