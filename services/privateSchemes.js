const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    timeout: 30000,
    maxRedirects: 5
});

const CATEGORIES = {
    STUDENTS: ['Scholarship', 'Education', 'Fellowship', 'Study', 'Grants', 'Nanhi Kali', 'ECSS', 'Bursar', 'Asha', 'Crisis'],
    FARMERS: ['Farmer', 'Agriculture', 'Rural', 'Livestock', 'Krishi', 'Harvest', 'Watershed', 'Agri-Business', 'Soil'],
    UNEMPLOYMENT: ['Skill', 'Training', 'Livelihood', 'Placement', 'Employment', 'Vocational', 'Academy', 'Pride'],
    SC_ST: ['Minority', 'Tribal', 'Caste', 'SC/ST', 'Jyoti Fellowship', 'Backward', 'Dalit', 'Inclusion', 'Social Justice', 'Marginalized', 'Scheduled'],
    PENSIONS: ['Elderly', 'Old Age', 'Senior Citizen', 'Geriatric', 'Social Security', 'Pension', 'Retirement', 'Dignity', 'Ageing']
};

/**
 * Scrapes Mahindra, Reliance, and Tata for private sector schemes across all beneficiary types.
 */
async function getPrivateSchemes() {
    console.log('[PrivateService] Launching Live Extraction for 50+ Schemes...');

    const targets = [
        { url: 'https://www.hdfcbank.com/personal/about-us/corporate-social-responsibility', org: 'HDFC Parivartan' },
        { url: 'https://www.icicifoundation.org/skill-development', org: 'ICICI Foundation' },
        { url: 'https://www.reliancefoundation.org/education', org: 'Reliance Foundation' },
        { url: 'https://www.kcmet.org/', org: 'Mahindra' },
        { url: 'https://www.reliancefoundation.org/rural-transformation', org: 'Reliance Rural' },
        { url: 'https://www.tatastrive.com/courses/', org: 'Tata STRIVE' },
        { url: 'https://www.tatatrusts.org/our-work/social-justice', org: 'Tata Trusts' },
        { url: 'https://www.tatatrusts.org/our-work/education', org: 'Tata Education' }
    ];

    const results = [];

    const promises = targets.map(async (target) => {
        try {
            const { data } = await client.get(target.url);
            const $ = cheerio.load(data);

            $('a, h2, h3, h4, strong, li').each((i, el) => {
                const text = $(el).text().trim().replace(/\s+/g, ' ');
                const href = $(el).attr('href') || $(el).find('a').attr('href');

                if (text.length > 12 && text.length < 120) {
                    const lowerText = text.toLowerCase();
                    let category = 'GENERAL';

                    for (const catKey in CATEGORIES) {
                        if (CATEGORIES[catKey].some(k => lowerText.includes(k.toLowerCase()))) {
                            category = catKey;
                            break;
                        }
                    }

                    if (category !== 'GENERAL' || text.includes('Initiative') || text.includes('Program') || text.includes('Scholarship')) {
                        let fullUrl = href;
                        if (fullUrl && fullUrl.startsWith('/')) {
                            fullUrl = new URL(target.url).origin + fullUrl;
                        } else if (fullUrl && !fullUrl.startsWith('http')) {
                            fullUrl = target.url + (target.url.endsWith('/') ? '' : '/') + fullUrl;
                        } else if (!fullUrl) {
                            fullUrl = target.url;
                        }

                        // DEEP FILTERING
                        const blacklist = [
                            'about us', 'contact', 'login', 'privacy', 'terms', 'legal',
                            'certificates', 'trustees', 'financials', 'who we are',
                            'careers', 'news', 'events', 'media', 'sitemap', 'home',
                            'read more', 'click here', 'search', 'navigation', 'footer'
                        ];

                        const isGeneric = blacklist.some(word => lowerText.includes(word));
                        const isTechnical = /_|-/.test(text) && !text.includes(' '); // Technical slug
                        const words = text.split(' ');

                        if (!isGeneric && !isTechnical && words.length >= 2 && words.length <= 15) {
                            results.push({
                                title: text,
                                url: fullUrl,
                                source: target.org,
                                type: 'Private',
                                category: category
                            });
                        }
                    }
                }
            });
        } catch (e) { }
    });

    await Promise.all(promises);

    const unique = results.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
    console.log(`[PrivateService] Extracted ${unique.length} live private schemes.`);
    return unique;
}

module.exports = { getPrivateSchemes };
