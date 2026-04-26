const { scrapeIndiaGov } = require('./services/indiaGovScraper');

async function test() {
    console.log('Testing India.gov.in Scraper...');
    const result = await scrapeIndiaGov('Andhra Pradesh');
    console.log('Result:', result);
}

test();
