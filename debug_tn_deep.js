const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const crypto = require('crypto');

const client = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        minVersion: 'TLSv1'
    })
});

async function debugTN() {
    console.log('Fetching tn.gov.in/scheme...');
    try {
        const { data } = await client.get('https://www.tn.gov.in/scheme');
        const $ = cheerio.load(data);

        console.log('Page Title:', $('title').text());

        // Find Department Links
        const deptLinks = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && (href.includes('department_wise') || href.includes('scheme/'))) {
                deptLinks.push({ text, href });
            }
        });

        console.log(`Found ${deptLinks.length} potential department links.`);
        console.log('Sample:', deptLinks.slice(0, 5));

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugTN();
