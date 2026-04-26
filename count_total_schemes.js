const { getMySchemes } = require('./services/mySchemeScraper');
const { scrapeState, STATE_PORTALS } = require('./services/multiStateScraper');

async function countTotal() {
    console.log('🚀 Starting Full Scheme Census...');
    const startTime = Date.now();

    // 1. Fetch MyScheme Data
    console.log('\n[1/2] Fetching MyScheme Database...');
    const mySchemes = await getMySchemes();
    console.log(`✅ MyScheme Count: ${mySchemes.length}`);

    // 2. Fetch State Portals (Sample of major ones to save time, or all?)
    // Let's do a quick sample of the "Hard" ones we just fixed + a few others
    // to give a realistic "Live" count addition.
    console.log('\n[2/2] Sampling State Portals (Hybrid Scraper)...');

    const sampleStates = [
        "Gujarat", "Maharashtra", "Uttar Pradesh", // The hard ones
        "West Bengal", "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh"
    ];

    let stateTotal = 0;
    const stateBreakdown = {};

    for (const state of sampleStates) {
        // We catch errors so one fail doesn't stop the count
        try {
            const results = await scrapeState(state);
            stateBreakdown[state] = results.length;
            stateTotal += results.length;
            console.log(`   -> ${state}: ${results.length}`);
        } catch (e) {
            console.log(`   -> ${state}: FAILED (${e.message})`);
            stateBreakdown[state] = 0;
        }
    }

    // Extrapolate for 28 states? Or just report what we have.
    // Let's report the knowns.

    console.log('\n------------------------------------------------');
    console.log('📊 FINAL CENSUS REPORT');
    console.log('------------------------------------------------');
    console.log(`Central Database (MyScheme): ${mySchemes.length}`);
    console.log(`Live Sample (8 Major States): ${stateTotal}`);
    console.log(`\nTOTAL VERIFIED SCHEMES: ${mySchemes.length + stateTotal}`);
    console.log('------------------------------------------------');
    console.log(`Time taken: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
}

countTotal();
