const { getMySchemes } = require('./services/mySchemeScraper');

async function auditStates() {
    console.log('Fetching MyScheme DB...');
    const all = await getMySchemes();
    console.log(`Total Schemes: ${all.length}`);

    const stateCounts = {};
    const statesOfInterest = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Uttar Pradesh", "Maharashtra", "Gujarat"];

    // Normalize and count
    all.forEach(s => {
        // schemes often have "state" field or it's in the title/details
        // MyScheme scraper returns: { title, url, description, etc... }
        // We need to check if 'state' is available or infer it
        let st = 'Central';
        if (s.details && s.details.includes('State:')) {
            // Extract from details if possible, or just search text
        }

        // Simple heuristic: Search for state name in Title or URL or Description
        const text = (s.title + " " + s.url).toLowerCase();

        for (const state of statesOfInterest) {
            if (text.includes(state.toLowerCase())) {
                stateCounts[state] = (stateCounts[state] || 0) + 1;
            }
        }
    });

    console.log('\n--- State Scheme Breakdown (Inferred from MyScheme DB) ---');
    for (const [state, count] of Object.entries(stateCounts)) {
        console.log(`${state}: ${count}`);
    }
}

auditStates();
