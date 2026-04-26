const axios = require('axios');
const cheerio = require('cheerio');

async function probeStaticPage(url, label) {
    console.log(`\n--- Probing ${label} (${url}) ---`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const title = $('title').text().trim();
        const bodyPreview = $('body').text().substring(0, 500).replace(/\s+/g, ' ');

        console.log(`✓ Status: ${response.status}`);
        console.log(`✓ Title: ${title}`);

        if (bodyPreview.length < 100) {
            console.log('⚠ WARNING: Body content seems empty or very short. Possible SPA/Loader.');
        } else {
            console.log(`✓ Content Preview: ${bodyPreview}...`);
        }

    } catch (error) {
        console.error(`✗ Failed: ${error.message}`);
    }
}

async function runProbes() {
    // 1. Tata STRIVE (Skill Development)
    await probeStaticPage('https://www.tatastrive.com/', 'Tata STRIVE');

    // 2. Reliance Foundation (Rural Transformation)
    await probeStaticPage('https://www.reliancefoundation.org/rural-transformation', 'Reliance BIJ');

    // 3. ITC e-Choupal (Agriculture)
    await probeStaticPage('https://www.itcportal.com/sustainability/agriculture.aspx', 'ITC Agriculture');

    // 4. Mahindra Rise (CSR overview)
    await probeStaticPage('https://www.mahindra.com/our-commitment/csr', 'Mahindra CSR');
}

runProbes();
