const { scrapeState } = require('./services/multiStateScraper');

async function verifyCentral() {
    console.log('Testing Central Government Scraper...');

    try {
        const results = await scrapeState("Central Government");
        console.log(`\nFound ${results.length} schemes.`);

        if (results.length > 0) {
            console.log('Sample:');
            results.slice(0, 5).forEach(s => console.log(` - ${s.title} (${s.url})`));
        } else {
            console.log('❌ Failed to extract schemes.');
        }

    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

verifyCentral();
