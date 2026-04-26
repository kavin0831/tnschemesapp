const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    },
    timeout: 30000
});

const BASE_URL = 'https://www.tn.gov.in';

const CATEGORY_KEYWORDS = {
    'Student': ['student', 'scholarship', 'education', 'school', 'college', 'exam', 'tuition', 'hostel', 'book bank', 'merit', 'topper'],
    'Farmer': ['Farmers', 'Reelers', 'Handloom Weavers', 'Agriculture', 'Rural', 'Livestock', 'Krishi', 'Harvest', 'Watershed', 'Agri-Business', 'Soil', 'crop', 'irrigation', 'seed', 'fertilizer', 'horticulture', 'sericulture', 'agricultural', 'cattle'],
    'Private Employee': ['labour', 'worker', 'industrial', 'msme', 'employee', 'factory'],
    'Government Employee': ['government employee', 'govt employee', 'pensioner'],
    'Self Employed': ['entrepreneur', 'startup', 'business', 'self employed', 'handloom', 'weaver', 'artisan'],
    'Unemployed': ['unemployed', 'youth employment', 'self employment', 'uyegp', 'job seeker'],
    'Senior Citizen': ['senior citizen', 'old age', 'pension', 'elderly', 'destitute'],
    'SC': ['adi dravidar', 'scheduled caste', 'sc/st', 'sc welfare'],
    'ST': ['tribal', 'scheduled tribe', 'primitive tribe'],
    'BC': ['backward class', 'bc welfare', 'bc/mbc'],
    'MBC': ['most backward', 'mbc', 'dnc', 'denotified'],
    'Female': ['women', 'girl', 'widow', 'pregnant', 'maternity', 'lady', 'mother', 'wife', 'ammaiyar', 'magalir'],
    'Disability': ['disabled', 'handicapped', 'differently abled', 'blind', 'deaf', 'visually impaired', 'hearing impaired', 'orthopedic'],
    'Farmer_Parent': ['children of farmers', 'wards of farmers', 'agricultural labourer', 'farmer family'],
    'Govt_Parent': ['wards of government', 'children of government', 'govt employees children'],
    'Weaver_Parent': ['children of weavers', 'wards of weavers', 'weaver family'],
    'ExService_Parent': ['ex-serviceman', 'ex-servicemen', 'children of servicemen', 'wards of servicemen']
};

async function getBeneficiaryCategories() {
    try {
        const timestamp = Date.now();
        console.log(`[scraper] Fetching categories (Live: ${timestamp})`);
        const { data } = await client.get(`${BASE_URL}/scheme_beneficiarywise.php?t=${timestamp}`);
        const $ = cheerio.load(data);
        const categories = [];
        $('a[href*="scheme_beneficiary_list.php"]').each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (href && name) {
                categories.push({ name, url: `${BASE_URL}/${href}` });
            }
        });
        return categories;
    } catch (e) {
        console.error('Error fetching categories:', e.message);
        return [];
    }
}

async function getSchemesForCategory(categoryUrl) {
    try {
        // Appending timestamp carefully (handling existing query params if any)
        const separator = categoryUrl.includes('?') ? '&' : '?';
        const urlWithCacheBust = `${categoryUrl}${separator}t=${Date.now()}`;

        console.log(`[scraper] Fetching: ${categoryUrl} ...`);
        const { data } = await client.get(urlWithCacheBust);
        const $ = cheerio.load(data);
        const schemes = [];
        $('a[href*="scheme_details.php"], a[href*="scheme_view.php"]').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            if (title && href) {
                schemes.push({
                    title,
                    url: href.startsWith('http') ? href : `${BASE_URL}/${href}`
                });
            }
        });
        return schemes.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
    } catch (e) {
        console.error(`Error scraping category ${categoryUrl}:`, e.message);
        return [];
    }
}

async function getSchemeDetails(schemeUrl) {
    try {
        const separator = schemeUrl.includes('?') ? '&' : '?';
        const urlWithCacheBust = `${schemeUrl}${separator}t=${Date.now()}`;

        const { data } = await client.get(urlWithCacheBust);
        const $ = cheerio.load(data);
        $('script, style, nav, header, footer').remove();
        const title = $('h1, h2').first().text().trim() || 'Details';
        const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
        return { title, description: text };
    } catch (e) {
        return { error: e.message };
    }
}

const multiStateScraper = require('./multiStateScraper');

async function getAllSchemes() {
    try {
        console.log('Fetching TN schemes via Wikipedia (Reliable & Unblocked)...');
        
        // Using Wikipedia is much more reliable in production as gov portals block Vercel/HuggingFace
        const schemes = await multiStateScraper.scrapeState('Tamil Nadu');
        
        if (schemes && schemes.length > 0) {
            console.log(`Successfully fetched ${schemes.length} TN schemes from Wikipedia.`);
            return schemes;
        } else {
            console.log('Wikipedia returned no schemes, trying basic fallback...');
            return [
                { title: "Dr. Muthulakshmi Reddy Maternity Benefit Scheme", url: "https://en.wikipedia.org/wiki/Welfare_schemes_in_Tamil_Nadu", source: "Wiki", type: "Govt", state: "Tamil Nadu" },
                { title: "Amma Unavagam (Mother's Canteen)", url: "https://en.wikipedia.org/wiki/Amma_Unavagam", source: "Wiki", type: "Govt", state: "Tamil Nadu" },
                { title: "Chief Minister's Comprehensive Health Insurance Scheme", url: "https://en.wikipedia.org/wiki/Chief_Minister's_Comprehensive_Health_Insurance_Scheme", source: "Wiki", type: "Govt", state: "Tamil Nadu" }
            ];
        }
    } catch (e) {
        console.error('Error fetching TN schemes:', e.message);
        return [];
    }
}

function filterSchemesByProfile(schemes, profile) {
    if (!profile) return schemes;

    return schemes.filter(scheme => {
        let score = 20;
        const title = scheme.title.toLowerCase();

        // 0. Explicit Category Match (for Private schemes)
        if (scheme.category && scheme.category === profile.occupation.toUpperCase()) score += 50;
        if (scheme.category && scheme.category === 'FARMERS' && (profile.occupation === 'Farmer' || profile.fatherOccupation === 'Farmer')) score += 50;
        if (scheme.category && scheme.category === 'SC_ST' && (profile.community === 'SC' || profile.community === 'ST')) score += 50;

        // 1. Occupation Match
        const occKeywords = CATEGORY_KEYWORDS[profile.occupation] || [];
        if (occKeywords.some(k => title.includes(k.toLowerCase()))) score += 30;

        // 2. Community Match
        const commKeywords = CATEGORY_KEYWORDS[profile.community] || [];
        if (commKeywords.some(k => title.includes(k.toLowerCase()))) score += 20;

        // 3. Gender
        if (profile.gender === 'Female' && (title.includes('women') || title.includes('girl') || title.includes('widow'))) score += 15;

        // 4. Disability
        if (profile.disability === 'Yes' && (title.includes('disabled') || title.includes('handicapped'))) score += 20;

        // 5. Age
        if (profile.age > 45 && (title.includes('senior') || title.includes('pension'))) score += 20;

        scheme.score = Math.min(score, 98);
        return score >= 35;
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
}

module.exports = {
    getBeneficiaryCategories,
    getSchemesForCategory,
    getSchemeDetails,
    getAllSchemes,
    filterSchemesByProfile,
    CATEGORY_KEYWORDS
};
