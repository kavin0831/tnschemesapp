const { scrapeKerala, scrapeKarnataka, scrapeAP, scrapeTelangana } = require('./services/multiStateScraper');

async function test() {
    console.log('Testing Multi-State Scrapers...');

    // Test Kerala
    const kerala = await scrapeKerala();
    console.log('Kerala Result Sample:', kerala.slice(0, 3));

    // Test Karnataka
    const karnataka = await scrapeKarnataka();
    console.log('Karnataka Result Sample:', karnataka.slice(0, 3));

    // Test AP
    const ap = await scrapeAP();
    console.log('AP Result Sample:', ap.slice(0, 3));

    // Test Telangana
    const telangana = await scrapeTelangana();
    console.log('Telangana Result Sample:', telangana.slice(0, 3));
}

test();
