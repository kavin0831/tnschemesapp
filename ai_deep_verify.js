const { rankSchemesAI } = require('./services/rankingEngine');

// Mock data to test Deep AI's ability to look inside descriptions
const mockDetails = [
    {
        title: "Pudhumai Penn Scheme",
        description: "Monthly financial assistance for girl students who studied in government schools from Class 6 to 12. Only female candidates are eligible."
    },
    {
        title: "UYEGP Scheme",
        description: "Youth Employment Generation Programme for unemployed youth. Annual income must not exceed Rs. 5,00,000. Age limit 18-45."
    },
    {
        title: "Special Scholarship",
        description: "Scholarship for students. Family annual income must be below Rs. 1,00,000."
    },
    {
        title: "Farmer Support",
        description: "Subsidy for small and marginal farmers."
    }
];

function runTest(profile) {
    console.log(`\nTesting Profile: ${profile.gender} ${profile.occupation}, Age ${profile.age}, Income ${profile.income}`);
    const results = rankSchemesAI(profile, mockDetails);
    console.log(`Verified Eligible: ${results.length}`);
    results.forEach(r => console.log(` >> Eligible: ${r.title}`));
}

// Case 1: Male Student, High Income
runTest({ gender: "Male", occupation: "Student", age: "21", income: "Below 5L" });

// Case 2: Female Student, Low Income
runTest({ gender: "Female", occupation: "Student", age: "20", income: "Below 1L" });

// Case 3: Unemployed Youth, Age 30
runTest({ gender: "Male", occupation: "Unemployed", age: "30", income: "Below 2.5L" });
