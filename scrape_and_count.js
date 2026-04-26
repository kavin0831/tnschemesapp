/**
 * Standalone Script to Scrape and Count Schemes from All Indian States
 * Run: node scrape_and_count.js
 */

const { scrapeState, STATE_PORTALS } = require('./services/multiStateScraper');

async function main() {
    console.clear();
    console.log('🇮🇳 STARTING PAN-INDIA SCHEME SCRAPER 🇮🇳');
    console.log('========================================');
    console.log('Fetching scheme details from official state portals...');

    const states = Object.keys(STATE_PORTALS);
    const results = [];

    // Process in chunks of 5 to be nice to network
    const chunkSize = 5;
    for (let i = 0; i < states.length; i += chunkSize) {
        const chunk = states.slice(i, i + chunkSize);
        console.log(`\nProcessing batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(states.length / chunkSize)}...`);

        const promises = chunk.map(async (state) => {
            const start = Date.now();
            try {
                process.stdout.write(`   > Scraping ${state}...\n`);
                const schemes = await scrapeState(state);
                const time = ((Date.now() - start) / 1000).toFixed(1);

                return {
                    State: state,
                    SchemesFound: schemes.length,
                    Status: schemes.length > 0 ? '✅ OK' : '⚠️ Empty',
                    Time: `${time}s`,
                    Sample: schemes.length > 0 ? schemes[0].title.substring(0, 40) + '...' : '-'
                };
            } catch (err) {
                return {
                    State: state,
                    SchemesFound: 0,
                    Status: '❌ Error',
                    Time: '0s',
                    Sample: '-'
                };
            }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }

    console.log('\n\n========================================');
    console.log('         🏁 FINAL SUMMARY REPORT 🏁       ');
    console.log('========================================');
    console.table(results);

    const total = results.reduce((sum, r) => sum + r.SchemesFound, 0);
    const activeStates = results.filter(r => r.SchemesFound > 0).length;

    console.log(`\n📈 Total Schemes Found: ${total}`);
    console.log(`🌍 Active States: ${activeStates} / ${states.length}`);
    console.log('========================================');
}

main();
