const puppeteer = require('puppeteer');

async function debugIndiaGov() {
    console.log('Debugging india.gov.in with Puppeteer...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Test for Andhra Pradesh
    const state = "Andhra Pradesh";
    const encodedState = encodeURIComponent(`["${state}"]`);
    const url = `https://www.india.gov.in/my-government/schemes/search?beneficiaryState=${encodedState}`;

    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for results
        await page.waitForSelector('.views-row', { timeout: 10000 });

        const content = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.views-row').forEach(row => {
                const titleEl = row.querySelector('.views-field-title a');
                if (titleEl) {
                    items.push({
                        title: titleEl.innerText.trim(),
                        url: titleEl.href
                    });
                }
            });
            return items;
        });

        console.log(`Found ${content.length} schemes for ${state}`);
        if (content.length > 0) console.log(content[0]);

    } catch (e) {
        console.error('Error:', e.message);
        // Snapshot for debug
        // await page.screenshot({ path: 'debug_indiagov.png' });
    }

    await browser.close();
}

debugIndiaGov();
