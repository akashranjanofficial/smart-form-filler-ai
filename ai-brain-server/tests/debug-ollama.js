const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';

async function checkOllama() {
    console.log('🔍 Testing Ollama Connection...');
    console.log(`📡 URL: ${OLLAMA_URL}`);

    try {
        // 1. Check Version/Root
        console.log('\n1️⃣  Checking Root Endpoint...');
        const root = await axios.get(OLLAMA_URL);
        console.log('✅ Root OK:', root.data);

        // 2. List Models
        console.log('\n2️⃣  Listing Models...');
        const models = await axios.get(`${OLLAMA_URL}/api/tags`);
        console.log(`✅ Found ${models.data.models.length} models.`);
        models.data.models.forEach(m => console.log(`   - ${m.name}`));

        // 3. Test Chat (Llama 3.1)
        console.log('\n3️⃣  Testing Chat Completion (llama3.1)...');
        const chat = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: 'llama3.1',
            messages: [{ role: 'user', content: 'Say "Hello World"' }],
            stream: false
        });
        console.log('✅ Chat Response:', chat.data.message.content);

        console.log('\n🎉 ALL CHECKS PASSED!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.code) console.error('   Code:', error.code);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

checkOllama();
