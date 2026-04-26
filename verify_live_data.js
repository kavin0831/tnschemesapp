const { getBeneficiaryCategories, getSchemesForCategory } = require('./services/scraper');

async function verify() {
    console.log("1. Checking Categories...");
    const categories = await getBeneficiaryCategories();
    console.log(`   Found ${categories.length} categories.`);

    if (categories.length > 0) {
        console.log(`   Sample: ${categories[0].name} -> ${categories[0].url}`);

        console.log("\n2. Checking Schemes from first category...");
        const schemes = await getSchemesForCategory(categories[0].url);
        console.log(`   Found ${schemes.length} schemes.`);
        if (schemes.length > 0) {
            console.log(`   Sample: ${schemes[0].title}`);
            console.log("\nSUCCESS: Data is flowing.");
        } else {
            console.log("\nFAILURE: Category found but no schemes extracted.");
        }
    } else {
        console.log("\nFAILURE: No categories found.");
    }
}

verify();
