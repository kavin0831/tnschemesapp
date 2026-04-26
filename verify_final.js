const axios = require('axios');

async function verifyIntegratedSearch() {
    console.log('--- Verifying Final Integrated Search ---');
    try {
        const profile = {
            age: 20,
            gender: 'Male',
            education: 'College',
            occupation: 'Student',
            income: 'Below 1L',
            community: 'SC',
            disability: 'No',
            fatherOccupation: 'Farmer'
        };

        console.log('Requesting schemes for SC Student/Farmer profile...');
        // We simulate the API call (ignoring auth check for this test wrapper since we're local)
        // or we just call the local server if running. 
        // For simplicity in this env, I'll test the logic by calling the functions in server context

        const serverUrl = 'http://localhost:3000/api/find-schemes';
        console.log(`Checking if server is live at ${serverUrl}...`);

        // Note: Real verify would need a token, but I can check the logic by simulating a internal call
        // if I can't reach the server.
    } catch (e) {
        console.error('Verification failed:', e.message);
    }
}

// Since I can't easily get a Clerk token in a standalone script, 
// I'll create a "internal" verification script that imports the logic.

const { filterSchemesByProfile } = require('./services/scraper');
const { getPrivateSchemes } = require('./services/privateSchemes');

async function verifyLogicInternally() {
    const profile = { age: 20, occupation: 'Student', community: 'SC' };

    const pSchemes = await getPrivateSchemes();
    const filteredP = filterSchemesByProfile(pSchemes.map(s => ({ ...s, type: 'Private' })), profile);

    console.log(`\nVerified Internal Logic:`);
    console.log(`- Private Schemes Fetched: ${pSchemes.length}`);
    console.log(`- Private Schemes Matching Profile: ${filteredP.length}`);

    if (filteredP.length > 0) {
        console.log(`- Sample Match: [${filteredP[0].type}] ${filteredP[0].source}: ${filteredP[0].title}`);
    } else {
        console.log('⚠ Warning: No private matches found for test profile. Check categories.');
    }
}

verifyLogicInternally();
