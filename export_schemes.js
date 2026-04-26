const fs = require('fs');
const path = require('path');
const { getBeneficiaryCategories, getSchemesForCategory, getSchemeDetails } = require('./services/scraper');

const OUTPUT_DIR = path.join(__dirname, 'scheme_data');

async function exportAllSchemesToCSV() {
    console.log('Starting Full Scheme Export...\n');

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    const categories = await getBeneficiaryCategories();
    console.log(`Found ${categories.length} beneficiary categories.\n`);

    for (const cat of categories) {
        const safeName = cat.name.replace(/[^a-zA-Z0-9]/g, '_');
        console.log(`Scraping: ${cat.name}...`);

        const schemes = await getSchemesForCategory(cat.url);
        console.log(`  Found ${schemes.length} schemes.`);

        if (schemes.length === 0) continue;

        // CSV Header
        let csvContent = 'Title,URL\n';

        for (const scheme of schemes) {
            // Escape quotes in title
            const title = scheme.title.replace(/"/g, '""');
            csvContent += `"${title}","${scheme.url}"\n`;
        }

        const filePath = path.join(OUTPUT_DIR, `${safeName}.csv`);
        fs.writeFileSync(filePath, csvContent);
        console.log(`  Saved to: ${filePath}\n`);
    }

    console.log('\n--- Export Complete ---');
    console.log(`All CSV files saved to: ${OUTPUT_DIR}`);
}

exportAllSchemesToCSV();
