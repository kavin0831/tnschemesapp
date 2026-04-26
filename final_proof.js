const { getMySchemes } = require('./services/mySchemeScraper');
const { scrapeState } = require('./services/multiStateScraper');

async function generateProof() {
    console.log('📊 Generatng Final Proof of Coverage...');

    // 1. Get MyScheme Counts
    const mySchemes = await getMySchemes();
    const mySchemeCounts = {};
    const states = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Uttar Pradesh", "Maharashtra", "Gujarat", "Odisha", "West Bengal", "Telangana"];

    mySchemes.forEach(s => {
        const text = (s.title + " " + s.url).toLowerCase();
        states.forEach(state => {
            if (text.includes(state.toLowerCase())) {
                mySchemeCounts[state] = (mySchemeCounts[state] || 0) + 1;
            }
        });
    });

    // 2. Get Live Scraper Counts
    console.log('\nScanning Live Portals (Wikipedia/Official)...');
    const liveCounts = {};
    for (const state of states) {
        try {
            const results = await scrapeState(state);
            liveCounts[state] = results.length;
            console.log(`   > ${state}: ${results.length}`);
        } catch (e) {
            console.log(`   > ${state}: Error`);
            liveCounts[state] = 0;
        }
    }

    // 3. Print Table
    console.log('\n======================================================');
    console.log(' STATE             | CENTRAL DB | LIVE SCRAPE | TOTAL');
    console.log('======================================================');

    states.forEach(state => {
        const c1 = mySchemeCounts[state] || 0;
        const c2 = liveCounts[state] || 0;
        const total = c1 + c2;
        const pass = total >= 10 ? '✅' : '❌';

        console.log(` ${state.padEnd(17)} | ${String(c1).padEnd(10)} | ${String(c2).padEnd(11)} | ${total} ${pass}`);
    });
    console.log('======================================================');
    console.log('TOTAL UNIQUE SCHEMES IN SYSTEM: ' + mySchemes.length + '+');
}

generateProof();
