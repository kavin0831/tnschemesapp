const axios = require('axios');

const states = [
    "Karnataka",
    "Madhya_Pradesh",
    "Maharashtra",
    "Telangana",
    "Odisha",
    "Tamil_Nadu",
    "West_Bengal",
    "Uttar_Pradesh"
];

async function checkLists() {
    console.log('Checking metadata for hypothetical Wiki Lists...');
    for (const state of states) {
        // pattern: List_of_schemes_of_the_government_of_State
        // OR: List_of_State_government_schemes
        const url1 = `https://en.wikipedia.org/wiki/List_of_schemes_of_the_government_of_${state}`;
        const url2 = `https://en.wikipedia.org/wiki/List_of_${state}_government_schemes`;

        try {
            await axios.head(url1);
            console.log(`[FOUND] ${state} -> ${url1}`);
        } catch (e) {
            try {
                await axios.head(url2);
                console.log(`[FOUND] ${state} -> ${url2}`);
            } catch (e2) {
                console.log(`[MISSING] ${state}`);
            }
        }
    }
}

checkLists();
