const axios = require('axios');

async function test() {
    try {
        console.log('Sending request to http://localhost:3001/api/find-schemes...');
        const res = await axios.post('http://localhost:3001/api/find-schemes', {
            age: "25",
            gender: "Male",
            occupation: "Student",
            community: "BC",
            income: "Below 1L",
            disability: "No",
            fatherOccupation: "Farmer",
            education: "College"
        });
        console.log('Response Status:', res.status);
        console.log('Schemes Found:', res.data.count);
    } catch (e) {
        console.error('TEST FAILED!');
        console.error('Status:', e.response?.status);
        console.error('Data:', JSON.stringify(e.response?.data, null, 2));
        console.error('Message:', e.message);
    }
}
test();
