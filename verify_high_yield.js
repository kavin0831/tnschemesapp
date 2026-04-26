const { scrapeState } = require('./services/multiStateScraper');

async function verifyHighYield() {
    console.log('Testing High-Yield Scraper Targets...');

    const targets = ["Tamil Nadu", "Karnataka", "Uttar Pradesh", "Kerala"];

    for (const state of targets) {
        console.log(`\n--- Testing ${state} ---`);
        try {
            const results = await scrapeState(state);
            console.log(`Count: ${results.length}`);
            if (results.length > 0) {
                console.log('Sample Schemes:');
                results.slice(0, 3).forEach(s => console.log(` - ${s.title} (${s.url})`));
            } else {
                console.log('❌ Still 0. Need deeper crawl or alternative source.');
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

verifyHighYield();
