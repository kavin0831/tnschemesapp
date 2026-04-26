const axios = require('axios');
const cheerio = require('cheerio');

async function debugWikiStates() {
    const url = 'https://en.wikipedia.org/wiki/List_of_schemes_of_the_government_of_India';
    console.log(`Fetching ${url}...`);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' }
        });
        const $ = cheerio.load(data);

        console.log('Scanning ALL links for State Scheme Lists...');
        const states = ["Karnataka", "Madhya Pradesh", "Maharashtra", "Telangana", "Odisha", "Tamil Nadu", "West Bengal", "Uttar Pradesh"];

        $('a').each((i, el) => {
            const text = $(el).text();
            const href = $(el).attr('href');

            if (href && href.includes('/wiki/')) {
                for (const state of states) {
                    if (text.includes(state)) {
                        console.log(`[MATCH] ${state}: ${text} -> ${href}`);
                    }
                }
            }
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugWikiStates();
