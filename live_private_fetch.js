const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000
});

const CATEGORIES = {
    STUDENTS: ['Scholarship', 'Education', 'Fellowship', 'Girl Child', 'Nanhi Kali', 'ECSS'],
    FARMERS: ['Farmers', 'Agriculture', 'Rural Transformation', 'Livestock', 'Krishi Mitra', 'E-Choupal'],
    UNEMPLOYMENT: ['Skill', 'Training', 'Livelihood', 'Placement', 'Employment', 'Academy for Skills', 'Pride Classrooms'],
    SC_ST: ['Minority', 'Tribal', 'Caste', 'SC/ST', 'Jyoti Fellowship', 'Foundation for Marginalized'],
    PENSIONS: ['Senior Citizen', 'Elderly', 'Old Age', 'Social Security', 'Pension', 'Retired']
};

const SOURCES = [
    'https://www.kcmet.org/',
    'https://www.reliancefoundation.org/rural-transformation',
    'https://www.reliancefoundation.org/education',
    'https://www.hdfcbank.com/personal/about-us/corporate-social-responsibility/parivartan',
    'https://www.icicifoundation.org/icici-academy-for-skills/',
    'https://www.icicifoundation.org/rural-livelihood/',
    'https://www.tatastrive.com/courses/',
    'https://www.tatatrusts.org/our-work/education',
    'https://www.sbifoundation.in/education'
];

async function scrapePrivateNames() {
    console.log('--- STARTING LIVE PRIVATE SCHEME EXTRACTION ---');
    const catalog = { STUDENTS: [], FARMERS: [], UNEMPLOYMENT: [], SC_ST: [], PENSIONS: [] };

    for (const url of SOURCES) {
        try {
            const { data } = await client.get(url);
            const $ = cheerio.load(data);

            // Look for headings, bold text, or list items that might be scheme names
            $('h1, h2, h3, h4, h5, strong, a, .card-title, .title').each((i, el) => {
                const text = $(el).text().trim().replace(/\s+/g, ' ');
                if (text.length > 12 && text.length < 100) {
                    const lowerText = text.toLowerCase();

                    for (const catKey in CATEGORIES) {
                        if (CATEGORIES[catKey].some(k => lowerText.includes(k.toLowerCase()))) {
                            // Deduplicate clean names
                            if (!catalog[catKey].includes(text)) {
                                catalog[catKey].push(text);
                            }
                        }
                    }
                }
            });
        } catch (e) {
            // Silently skip failed pages
        }
    }

    console.log('\n================================================');
    console.log('       LIVE PRIVATE SCHEME EXTRACTION REPORT     ');
    console.log('================================================\n');

    for (const category in catalog) {
        console.log(`CATEGORY: ${category} (${catalog[category].length} verified names)`);
        console.log('------------------------------------------------');

        const list = catalog[category];
        if (list.length === 0) {
            console.log('  No specific names extracted (Check source accessibility)');
        } else {
            // Show at least 10 or all if less
            list.slice(0, 15).forEach((name, i) => {
                console.log(`${(i + 1).toString().padStart(2)}. ${name}`);
            });
            if (list.length > 15) console.log(`  ... and ${list.length - 15} more`);
        }
        console.log('');
    }
}

scrapePrivateNames();
