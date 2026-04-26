const puppeteer = require('puppeteer');

async function debugScroll() {
    console.log('Debugging rules.myscheme.in scrolling...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        await page.goto('https://rules.myscheme.in/', { waitUntil: 'networkidle2', timeout: 60000 });

        let initialCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        console.log(`Initial Row Count: ${initialCount}`);

        // Scroll down a few times
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 1000));
        }

        let newCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        console.log(`Row Count after scrolling: ${newCount}`);

        // Check if "Load More" exists?
        const loadMore = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.innerText.includes('Load') || b.innerText.includes('More'))?.innerText;
        });
        if (loadMore) console.log(`Found Load More button: ${loadMore}`);

    } catch (e) {
        console.error('Error:', e.message);
    }

    await browser.close();
}

debugScroll();
