const puppeteer = require('puppeteer');

async function debugGujarat() {
    console.log('Debug Scrape: DigitalGujarat');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        await page.goto('https://www.digitalgujarat.gov.in/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));

        // Take screenshot
        await page.screenshot({ path: 'gujarat_debug.png' });

        // Dump links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({ text: a.innerText.trim(), href: a.href }))
                .filter(a => a.text.includes('Scheme') || a.text.includes('Service'))
                .slice(0, 10);
        });
        console.log('Relevant Links:', links);

    } catch (e) {
        console.error('Error:', e.message);
    }

    await browser.close();
}

debugGujarat();
