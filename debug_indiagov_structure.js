const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugStructure() {
    console.log('[Debug] Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto('https://www.india.gov.in/my-government/schemes/search', { waitUntil: 'networkidle2', timeout: 60000 });

        // Dump the entire body HTML to a file? No, too big. 
        // Just look for input/select elements.

        const content = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
                tag: 'input',
                id: el.id,
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                value: el.value
            }));

            const selects = Array.from(document.querySelectorAll('select')).map(el => ({
                tag: 'select',
                id: el.id,
                name: el.name,
                options: el.options.length
            }));

            return { inputs, selects };
        });

        console.log('--- Form Elements Found ---');
        console.log(JSON.stringify(content, null, 2));

        const htmlDump = await page.content();
        fs.writeFileSync('indiagov_dump.html', htmlDump);
        console.log('Full HTML saved to indiagov_dump.html');

    } catch (e) {
        console.error('Error:', e.message);
    }

    await browser.close();
}

debugStructure();
