const axios = require('axios');
// Mocking the server logic locally to verify the deduplication code block
// since we can't easily hit the running API without auth headers setup in this script.

async function verifyLogic() {
    const officialSchemes = [
        { title: "PM Kisan Samman Nidhi", url: "http://pmkisan.gov.in", source: "Official Portal" },
        { title: "Odisha State Scholarship", url: "http://odisha.gov.in", source: "Official Portal" }
    ];

    const mySchemeData = [
        { title: "PM Kisan Samman Nidhi", url: "http://myscheme/pmkisan" }, // Duplicate
        { title: "Pradhan Mantri Awas Yojana", url: "http://myscheme/pmay" }, // Unique Central
        { title: "Odisha KALIA Scheme", url: "http://myscheme/kalia" } // Unique State
    ];

    const targetState = "Odisha";
    const stateKeywords = ["odisha"];

    // Set of normalized titles from Official Source to check duplicates
    const officialTitles = new Set(officialSchemes.map(s => s.title.toLowerCase().replace(/[^a-z0-9]/g, '')));

    const relevantMySchemes = mySchemeData.filter(s => {
        const t = s.title.toLowerCase();
        const tClean = t.replace(/[^a-z0-9]/g, '');

        if (officialTitles.has(tClean)) {
            console.log(`[Duplicate Removed] ${s.title}`);
            return false;
        }

        if (stateKeywords.some(k => t.includes(k))) return true;
        if (t.includes('central') || t.includes('pradhan') || t.includes('india')) return true;

        return false;
    }).map(s => ({
        ...s,
        source: 'MyScheme',
        type: 'Govt'
    }));

    const results = [
        ...officialSchemes,
        ...relevantMySchemes
    ];

    console.log("\n--- Final Merged Results ---");
    results.forEach(r => console.log(`- [${r.source}] ${r.title}`));
}

verifyLogic();
