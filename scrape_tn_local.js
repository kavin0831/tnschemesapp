const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.tn.gov.in';
const TARGET_URL = `${BASE_URL}/scheme_beneficiary_list.php?id=MTM=`;

async function scrapeLocal() {
    console.log('🚀 Starting LOCAL scrape of tn.gov.in...');
    try {
        const { data } = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(data);
        const schemes = [];

        $('a[href*="scheme_details.php"], a[href*="scheme_view.php"]').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            if (title && href) {
                schemes.push({
                    title,
                    url: href.startsWith('http') ? href : `${BASE_URL}/${href}`,
                    source: 'TN.gov.in (Static)',
                    state: 'Tamil Nadu',
                    type: 'Govt'
                });
            }
        });

        const unique = schemes.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
        
        // Save to a JSON file that the server can read
        const filePath = path.join(__dirname, 'tn_schemes_data.json');
        fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));

        console.log(`✅ SUCCESS! Found ${unique.length} schemes.`);
        console.log(`📂 Data saved to: ${filePath}`);
        console.log('\nNext: Push this file to GitHub and your website will show these schemes!');

    } catch (e) {
        console.error('❌ Error during local scrape:', e.message);
        console.log('Make sure you have an active internet connection and can visit tn.gov.in in your browser.');
    }
}

scrapeLocal();
