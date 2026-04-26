const { scrapeState, STATE_PORTALS } = require('./services/multiStateScraper');

async function auditAllStates() {
    console.log('🚀 Starting Comprehensive State Scraper Audit...');
    console.log('------------------------------------------------');

    const states = Object.keys(STATE_PORTALS);
    const results = [];
    const errors = [];

    // Parallel processing with chunking to avoid network overload
    const CHUNK_SIZE = 5;

    for (let i = 0; i < states.length; i += CHUNK_SIZE) {
        const chunk = states.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (state) => {
            try {
                const start = Date.now();
                const schemes = await scrapeState(state);
                const duration = ((Date.now() - start) / 1000).toFixed(2);

                return {
                    state,
                    count: schemes.length,
                    status: schemes.length > 0 ? '✅ Success' : '⚠️ No Data',
                    duration: `${duration}s`,
                    top_scheme: schemes.length > 0 ? schemes[0].title.substring(0, 30) + '...' : 'N/A'
                };
            } catch (e) {
                return {
                    state,
                    count: 0,
                    status: '❌ Error',
                    duration: '0s',
                    top_scheme: e.message.substring(0, 30)
                };
            }
        });

        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);
        console.log(`Processed ${Math.min(i + CHUNK_SIZE, states.length)}/${states.length} states...`);
    }

    console.log('\n================================================');
    console.log('             STATE SCRAPER SUMMARY              ');
    console.log('================================================');
    console.table(results);

    const totalSchemes = results.reduce((acc, r) => acc + r.count, 0);
    const successCount = results.filter(r => r.count > 0).length;

    console.log(`\n📊 TOTAL SCHEMES FOUND: ${totalSchemes}`);
    console.log(`✅ DISCOVERY RATE: ${successCount}/${states.length} States`);
    console.log('================================================');
}

auditAllStates();
