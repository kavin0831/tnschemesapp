const axios = require('axios');

async function triggerScrape() {
    try {
        console.log('--- Triggering Search to Test Live Scraper ---');
        // We just need to hit the endpoint; the logs in debug_server window will show the scraping URLs
        await axios.post('http://localhost:3001/api/find-schemes', {
            age: "30",
            gender: "Female",
            occupation: "Farmer", // Should trigger recursive scraping for Farmer category
            community: "BC",
            income: "Below 1L",
            disability: "No",
            fatherOccupation: "Farmer",
            education: "School"
        });
        console.log('Request Sent. Check Server 1 logs for timestamps.');
    } catch (e) {
        console.log('Done (ignore response data)');
    }
}
triggerScrape();
