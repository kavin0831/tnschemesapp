const { getBeneficiaryCategories, getSchemesForCategory } = require('./services/scraper');

async function debug() {
    console.log("Fetching Categories...");
    const categories = await getBeneficiaryCategories();
    console.log(`Total Categories: ${categories.length}`);

    if (categories.length === 0) {
        console.error("No categories found. Scraper might be blocked or URL changed.");
        return;
    }

    const first = categories[0];
    console.log(`Scraping schemes for category: ${first.name} (${first.url})`);
    const schemes = await getSchemesForCategory(first.url);
    console.log(`Schemes found: ${schemes.length}`);
}

debug();
