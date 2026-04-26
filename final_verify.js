const { rankSchemes } = require('./services/rankingEngine');
const { getSchemeDetails } = require('./services/scraper');

async function verify() {
    console.log("--- 1. Testing Filter Logic ---");
    const maleUser = { age: "25", gender: "Male", occupation: "Student" };
    const mixedSchemes = [
        { title: "Scholarship for Women", description: "This is only for female students." },
        { title: "General Scholarship", description: "Open to all students." }
    ];
    const results = rankSchemes(maleUser, mixedSchemes);
    console.log(`Male User Results: ${results.length} (Expected: 1)`);
    results.forEach(r => console.log(` - ${r.title}`));

    console.log("\n--- 2. Testing Detail Cleaning ---");
    const testUrl = "https://www.tn.gov.in/scheme_details.php?id=MTQwMQ==";
    const details = await getSchemeDetails(testUrl);
    if (details.fullHtml) {
        console.log("Detail HTML Length:", details.fullHtml.length);
        console.log("Clutter Check (navbar):", details.fullHtml.includes("id=\"nav\"") ? "FAILED" : "PASSED");
    } else {
        console.log("FAILED to fetch details.");
    }
}

verify();
