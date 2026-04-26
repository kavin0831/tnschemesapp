const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
    timeout: 30000
});

async function testIndiaGov(state) {
    console.log(`Testing india.gov.in for ${state}...`);
    // URL pattern from user: search?beneficiaryState=["State Name"]
    // URL encoded: %5B%22State+Name%22%5D
    const encodedState = encodeURIComponent(`["${state}"]`);
    const url = `https://www.india.gov.in/my-government/schemes/search?beneficiaryState=${encodedState}`;

    try {
        const { data } = await client.get(url);
        const $ = cheerio.load(data);

        const schemes = [];
        // Inspecting typical drupal view structure
        $('.views-row').each((i, el) => {
            const title = $(el).find('.views-field-title a').text().trim();
            const link = $(el).find('.views-field-title a').attr('href');
            if (title) {
                schemes.push({ title, link });
            }
        });

        console.log(`Found ${schemes.length} schemes for ${state}`);
        if (schemes.length > 0) console.log(schemes[0]);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testIndiaGov('Andhra Pradesh');
testIndiaGov('Bihar');
