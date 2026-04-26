const { scrapeState } = require('./services/multiStateScraper');

async function verifyNewUrls() {
    console.log('Testing Enhanced Scraper on updated URLs...');

    // States that were previously problematic
    const targets = ["West Bengal", "Uttar Pradesh", "Maharashtra", "Gujarat"];

    for (const state of targets) {
        console.log(`\n--- Testing ${state} ---`);
        const results = await scrapeState(state);
        console.log(`Count: ${results.length}`);
        if (results.length > 0) console.log(`Sample: ${results[0].title} -> ${results[0].url}`);
    }
}

verifyNewUrls();
