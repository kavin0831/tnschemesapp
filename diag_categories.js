const { getBeneficiaryCategories, BENEFICIARY_KEYWORDS } = require('./services/scraper');

async function diag() {
    const categories = await getBeneficiaryCategories();
    const profile = { occupation: "Student" };
    const keywords = BENEFICIARY_KEYWORDS[profile.occupation];

    console.log(`Testing Profile: Student`);
    console.log(`Keywords: ${keywords}`);

    categories.forEach(cat => {
        const matches = keywords.some(k => cat.name.toLowerCase().includes(k.toLowerCase()));
        if (matches) console.log(`  MATCH: ${cat.name}`);
    });
}

diag();
