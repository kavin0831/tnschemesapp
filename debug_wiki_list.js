const axios = require('axios');
const cheerio = require('cheerio');

async function debugWikiList() {
    const url = 'https://en.wikipedia.org/wiki/List_of_schemes_of_the_government_of_India';
    console.log(`Fetching ${url}...`);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);

        console.log('Title:', $('title').text());

        // Check for tables
        const distinctSchemes = [];

        // Strategy 1: Wikitables
        $('table.wikitable tr').each((i, row) => {
            // usually the first cell has the scheme name/link
            const link = $(row).find('th a').first();
            // sometimes it's in a td
            const link2 = $(row).find('td a').first();

            const target = link.length ? link : link2;

            if (target.length) {
                const title = target.text().trim();
                const href = target.attr('href');
                if (title && href && !title.startsWith('[')) {
                    distinctSchemes.push({ title, href });
                }
            }
        });

        console.log(`\nFound ${distinctSchemes.length} schemes likely in tables.`);
        if (distinctSchemes.length > 0) {
            console.log('Sample:', distinctSchemes.slice(0, 3));
        }

        // Strategy 2: Lists
        // If tables fail, we might check lists, but this page is known to use tables.

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugWikiList();
