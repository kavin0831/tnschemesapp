const puppeteer = require('puppeteer');

async function debugMyScheme() {
    console.log('Debugging rules.myscheme.in table structure...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        await page.goto('https://rules.myscheme.in/', { waitUntil: 'networkidle2' });

        // Get table headers
        const headers = await page.evaluate(() => {
            const ths = Array.from(document.querySelectorAll('table thead th'));
            return ths.map(th => th.innerText.trim());
        });
        console.log('Table Headers:', headers);

        // Get first row sample
        const firstRow = await page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('table tbody tr:first-child td'));
            return tds.map(td => td.innerText.trim());
        });
        console.log('First Row Sample:', firstRow);

    } catch (e) {
        console.error('Error:', e.message);
    }

    await browser.close();
}

debugMyScheme();
