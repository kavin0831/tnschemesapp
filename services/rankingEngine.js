/**
 * Complete Eligibility Engine for Tamil Nadu Schemes
 * Filters based on: Age, Gender, Occupation, Community, Income, Parent's Occupation
 */

// Age limits for different occupations/categories
const AGE_LIMITS = {
    'Student': { max: 35 },
    'Senior Citizen': { min: 60 },
    'Unemployed': { max: 45 }
};

// Keywords that indicate schemes for specific parent occupations
const PARENT_KEYWORDS = {
    'Farmer': ['children of farmers', 'wards of farmers', 'agricultural labourers', 'farmer family'],
    'Government Employee': ['wards of government', 'children of government', 'govt employees children'],
    'Ex-Serviceman': ['ex-serviceman', 'ex-servicemen', 'children of servicemen'],
    'Handloom Weaver': ['children of weavers', 'wards of weavers', 'weaver family']
};

// Community-specific keywords
const COMMUNITY_KEYWORDS = {
    'SC': ['adi dravidar', 'scheduled caste', 'sc/st', 'sc ', '/sc'],
    'ST': ['tribal', 'scheduled tribe', 'sc/st', 'st '],
    'BC': ['backward class', 'bc/mbc', 'bc '],
    'MBC': ['most backward', 'mbc', 'dnc']
};

function parseIncomeValue(incomeStr) {
    if (!incomeStr) return 1000000;
    const clean = incomeStr.toLowerCase();
    if (clean.includes('below 1l') || clean.includes('1-3l')) return 100000;
    if (clean.includes('1-3l')) return 300000;
    if (clean.includes('3-5l')) return 500000;
    return 1000000;
}

function checkAgeEligibility(userAge, schemeText) {
    const age = parseInt(userAge) || 0;

    // Check for age limits in scheme text
    const ageMatch = schemeText.match(/age.*?(\d+)\s*(?:to|-)?\s*(\d+)?/i);
    if (ageMatch) {
        const minAge = parseInt(ageMatch[1]);
        const maxAge = ageMatch[2] ? parseInt(ageMatch[2]) : 100;
        if (age < minAge || age > maxAge) return false;
    }

    // Common age-based exclusions
    if (age > 35 && schemeText.includes('student')) return false;
    if (age < 60 && schemeText.includes('senior citizen')) return false;
    if (age < 60 && schemeText.includes('old age pension')) return false;

    return true;
}

function checkGenderEligibility(userGender, schemeText) {
    if (userGender === 'Male') {
        const femaleOnly = ['women only', 'girls only', 'female only', 'widow', 'pregnant',
            'pudhumai penn', 'girl child', 'magalir', 'ammaiyar'];
        if (femaleOnly.some(k => schemeText.includes(k))) return false;
    }
    return true;
}

function checkCommunityEligibility(userCommunity, schemeText) {
    if (!userCommunity || userCommunity === 'OC') {
        // OC users should not see caste-specific schemes
        const casteKeywords = ['adi dravidar', 'scheduled caste', 'scheduled tribe',
            'backward class', 'mbc', 'sc/st', 'tribal welfare'];
        if (casteKeywords.some(k => schemeText.includes(k))) return false;
    }
    return true;
}

function checkParentOccupation(fatherOcc, schemeText) {
    // Check if scheme is specifically for children of certain occupations
    const parentSpecific = ['children of', 'wards of', 'son/daughter of'];
    if (parentSpecific.some(k => schemeText.includes(k))) {
        // This scheme requires specific parent occupation
        const keywords = PARENT_KEYWORDS[fatherOcc] || [];
        if (keywords.length > 0) {
            return keywords.some(k => schemeText.includes(k));
        }
        return false; // User's father occupation doesn't match
    }
    return true;
}

function checkIncomeEligibility(userIncome, schemeText) {
    const userIncomeValue = parseIncomeValue(userIncome);

    // Look for income limits in text
    const incomeMatch = schemeText.match(/income.*?below.*?rs\.?\s*([\d,]+)/i) ||
        schemeText.match(/income.*?not.*?exceed.*?rs\.?\s*([\d,]+)/i) ||
        schemeText.match(/annual income.*?rs\.?\s*([\d,]+)/i);

    if (incomeMatch) {
        const limit = parseInt(incomeMatch[1].replace(/,/g, ''));
        if (limit > 0 && userIncomeValue > limit) return false;
    }
    return true;
}

function calculateRelevanceScore(userProfile, schemeTitle, schemeText) {
    let score = 50; // Base score
    const text = schemeText.toLowerCase();
    const title = schemeTitle.toLowerCase();

    const occupation = (userProfile.occupation || '').toLowerCase();
    const community = userProfile.community || '';

    // Occupation match
    if (title.includes(occupation) || text.includes(occupation)) score += 20;

    // Community match (higher priority for matched community)
    if (community && COMMUNITY_KEYWORDS[community]) {
        if (COMMUNITY_KEYWORDS[community].some(k => text.includes(k))) score += 30;
    }

    // Disability match
    if (userProfile.disability === 'Yes') {
        const disabilityKw = ['disabled', 'handicapped', 'differently abled', 'blind', 'deaf'];
        if (disabilityKw.some(k => text.includes(k))) score += 25;
    }

    return score;
}

function rankSchemesAI(userProfile, schemes) {
    console.log(`\n--- Complete Eligibility Check (${schemes.length} inputs) ---`);
    console.log(`Profile: Age=${userProfile.age}, Gender=${userProfile.gender}, Occ=${userProfile.occupation}`);
    console.log(`         Community=${userProfile.community}, Father=${userProfile.fatherOccupation}`);

    const userAge = parseInt(userProfile.age) || 0;

    // Basic age-occupation sanity check
    if (userProfile.occupation === 'Student' && userAge > 35) {
        console.log('  NOTE: Age > 35, limiting student schemes');
    }

    const results = schemes.map(scheme => {
        const text = ((scheme.title || '') + ' ' + (scheme.description || '')).toLowerCase();

        // Check all eligibility criteria
        if (!checkAgeEligibility(userProfile.age, text)) {
            return { ...scheme, score: -1, reason: 'Age ineligible' };
        }
        if (!checkGenderEligibility(userProfile.gender, text)) {
            return { ...scheme, score: -1, reason: 'Gender ineligible' };
        }
        if (!checkCommunityEligibility(userProfile.community, text)) {
            return { ...scheme, score: -1, reason: 'Community ineligible' };
        }
        if (!checkParentOccupation(userProfile.fatherOccupation, text)) {
            return { ...scheme, score: -1, reason: 'Parent occupation ineligible' };
        }
        if (!checkIncomeEligibility(userProfile.income, text)) {
            return { ...scheme, score: -1, reason: 'Income ineligible' };
        }

        const score = calculateRelevanceScore(userProfile, scheme.title, text);
        return { ...scheme, score };
    });

    const eligible = results.filter(s => s.score >= 50).sort((a, b) => b.score - a.score);

    console.log(`--- Eligible: ${eligible.length} of ${schemes.length} ---\n`);
    return eligible;
}

module.exports = { rankSchemesAI: rankSchemesAI };
