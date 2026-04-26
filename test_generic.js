const { scrapeState } = require('./services/multiStateScraper');

async function test() {
    console.log('Testing Generic State Scraper...');

    // Test a few states
    const states = ["Gujarat", "Haryana", "Punjab"];

    for (const state of states) {
        console.log(`\n--- Testing ${state} ---`);
        const results = await scrapeState(state);
        console.log(`Result Count: ${results.length}`);
        if (results.length > 0) console.log('Sample:', results.slice(0, 2));
    }
}

test();
