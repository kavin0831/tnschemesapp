const { rankSchemes } = require('./services/rankingEngine');

const userProfile = {
    age: "20",
    gender: "Female",
    education: "College",
    occupation: "Student",
    income: "Below 1L",
    disability: "No"
};

const mockSchemes = [
    { title: "Awards to Bright Students", url: "http://test.com/1" },
    { title: "Free Laptop Scheme", url: "http://test.com/2" },
    { title: "Farmer Subsidy", url: "http://test.com/3" },
    { title: "Irrelevant Scheme", url: "http://test.com/4" }
];

console.log("Testing with profile:", userProfile);
const ranked = rankSchemes(userProfile, mockSchemes);

ranked.forEach(s => {
    console.log(`[${s.score}] ${s.title}`);
});
