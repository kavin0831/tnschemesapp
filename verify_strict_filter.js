function verifyStrictFilter() {
    const targetState = "Sikkim";
    const target = targetState.toLowerCase();
    const stateKeywords = [target];

    const ALL_STATES = [
        "andhra", "arunachal", "assam", "bihar", "chandigarh", "chhattisgarh",
        "delhi", "goa", "gujarat", "haryana", "himachal", "jammu", "jharkhand",
        "karnataka", "kerala", "ladakh", "lakshadweep", "madhya", "maharashtra",
        "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "puducherry",
        "punjab", "rajasthan", "sikkim", "tamil", "telangana", "tripura",
        "uttar", "uttarakhand", "bengal"
    ];

    const otherStates = ALL_STATES.filter(s => !stateKeywords.some(k => k.includes(s) || s.includes(k)));

    const testSchemes = [
        "Indira Gandhi National Widow Pension Scheme - Bihar", // SHOULD REJECT
        "Indira Gandhi National Widow Pension Scheme - Sikkim", // SHOULD KEEP
        "Pradhan Mantri Awas Yojana (Urban)", // SHOULD KEEP (Central)
        "Goa Yuva Samvad Yojana" // SHOULD REJECT
    ];

    console.log(`Target State: ${targetState}`);
    console.log(`Blocked Keywords: ${otherStates.slice(0, 5).join(", ")}...`);

    testSchemes.forEach(title => {
        const t = title.toLowerCase();
        let pass = true;
        let reason = "Accepted";

        if (otherStates.some(os => t.includes(os))) {
            pass = false;
            reason = "REJECTED (Other State)";
        } else if (stateKeywords.some(k => t.includes(k))) {
            pass = true;
            reason = "ACCEPTED (State Match)";
        } else if (t.includes('central') || t.includes('pradhan') || t.includes('india') || t.includes('national')) {
            pass = true;
            reason = "ACCEPTED (Central)";
        } else {
            pass = false;
            reason = "REJECTED (No Match)";
        }

        console.log(`"${title}" -> ${reason}`);
    });
}

verifyStrictFilter();
