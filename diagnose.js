const { getBeneficiaryCategories, getSchemesForCategory, getSchemeDetails, BENEFICIARY_KEYWORDS } = require('./services/scraper');
const { rankSchemes } = require('./services/rankingEngine');

// Mock User Profile (The one the user is likely testing with)
const userProfile = {
    age: "20",
    gender: "Female",
    education: "College",
    occupation: "Student",
    income: "Below 1L",
    disability: "No"
};

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");
    console.log("User Profile:", userProfile);

    // 1. Categories
    console.log("\n1. Fetching Categories...");
    const categories = await getBeneficiaryCategories();
    console.log(`Found ${categories.length} total categories.`);

    // 2. Filter Logic
    console.log("\n2. Filtering Categories...");
    let targetUrls = new Set();
    const addMatches = (userAttr) => {
        const val = userProfile[userAttr];
        const keywords = BENEFICIARY_KEYWORDS[val] || [];
        console.log(`Attribute [${userAttr}=${val}] maps to keywords:`, keywords);

        categories.forEach(cat => {
            if (keywords.some(k => cat.name.toLowerCase().includes(k.toLowerCase()))) {
                console.log(`  MATCH: ${cat.name} -> ${cat.url}`);
                targetUrls.add(cat.url);
            }
        });
    };

    addMatches('occupation');
    addMatches('gender'); // Female

    const urlsToScrape = Array.from(targetUrls);
    console.log(`Target URLs to scrape (${urlsToScrape.length}):`, urlsToScrape);

    if (urlsToScrape.length === 0) {
        console.error("CRITICAL: No matching categories found. This is why it returns empty.");
        return;
    }

    // 3. Scheme Fetching
    console.log("\n3. Scraping Schemes (Limit 2 categories)...");
    const limitedUrls = urlsToScrape.slice(0, 2);
    let allSchemes = [];

    for (const url of limitedUrls) {
        console.log(`  Scraping ${url}...`);
        const schemes = await getSchemesForCategory(url);
        console.log(`    Found ${schemes.length} schemes.`);
        schemes.forEach(s => console.log(`      Found Scheme: [${s.title}] (${s.url})`));
        allSchemes = [...allSchemes, ...schemes];
    }

    if (allSchemes.length === 0) {
        console.error("CRITICAL: No scheme links found in the categories. Selector issue?");
        return;
    }

    // 4. Ranking
    console.log("\n4. Ranking...");
    const ranked = rankSchemes(userProfile, allSchemes);
    console.log("Scored Schemes:");
    ranked.forEach(s => console.log(`  [${s.score}] ${s.title}`));

    if (ranked.length === 0) {
        console.log("CRITICAL: Ranking returned 0 items. All scores were negative?");
        // Print raw scores
        allSchemes.forEach(s => {
            // We need to re-run calculation manually to compare
            // But rankSchemes does this.
        });
    }

    console.log("--- DIAGNOSTIC END ---");
}

diagnose();
