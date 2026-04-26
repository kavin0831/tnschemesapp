const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

async function inspectDetail() {
    const url = 'https://www.tn.gov.in/scheme_details.php?id=MTQwMQ==';
    try {
        const { data } = await client.get(url);
        // Print the first 15000 chars of body to find structure
        const marker = data.indexOf('<body');
        console.log(data.substring(marker, marker + 10000));
    } catch (e) {
        console.error(e);
    }
}

inspectDetail();
