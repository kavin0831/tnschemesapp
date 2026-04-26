const https = require('https');

// SambaNova API Configuration
const API_KEY = '2ddaa116-b04d-4a4b-bd99-f4467e611947';
const API_URL = 'https://api.sambanova.ai/v1/chat/completions';

// Test streaming with DeepSeek-V3.1
async function testSambaNova() {
    console.log('🚀 Testing SambaNova API with DeepSeek-V3.1 Streaming...\n');

    const requestBody = JSON.stringify({
        stream: true,
        model: 'gpt-oss-120b',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant for Tamil Nadu government schemes.'
            },
            {
                role: 'user',
                content: 'Explain what government schemes are available for farmers in Tamil Nadu in 2-3 sentences.'
            }
        ]
    });

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const url = new URL(API_URL);
    const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        ...options
    }, (res) => {
        console.log(`Status Code: ${res.statusCode}\n`);
        console.log('📡 Streaming Response:\n');

        let buffer = '';

        res.on('data', (chunk) => {
            buffer += chunk.toString();

            // Process SSE (Server-Sent Events) format
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        console.log('\n\n✅ Stream completed!');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            process.stdout.write(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        });

        res.on('end', () => {
            console.log('\n\n🎯 Response complete!');
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error:', error.message);
    });

    req.write(requestBody);
    req.end();
}

// Run the test
testSambaNova();
