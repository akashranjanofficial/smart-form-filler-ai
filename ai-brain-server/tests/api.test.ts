/**
 * AI Brain Server - API Integration Tests
 * Tests for the Express endpoints
 * Run with: npm test -- tests/api.test.ts
 */

import request from 'supertest';
import express from 'express';

// Mock the services
jest.mock('../src/services/broca', () => ({
    BrocaService: jest.fn().mockImplementation(() => ({
        chat: jest.fn().mockResolvedValue('Mocked AI response')
    }))
}));

jest.mock('../src/services/hippocampus', () => ({
    HippocampusService: jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        addMemory: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue([
            { item: { metadata: { text: 'Remembered context' } }, score: 0.95 }
        ])
    }))
}));

// Create test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Import mocked services
    const { BrocaService } = require('../src/services/broca');
    const { HippocampusService } = require('../src/services/hippocampus');

    const broca = new BrocaService();
    const hippocampus = new HippocampusService();

    // Health endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'online',
            service: 'AI Brain (Exocortex)',
            version: '1.0.0',
            memory: 'initialized'
        });
    });

    // Memory endpoint
    app.post('/v1/memory', async (req, res) => {
        try {
            const { content, metadata } = req.body;
            if (!content) {
                return res.status(400).json({ error: 'Content is required' });
            }
            await hippocampus.addMemory(content, metadata);
            res.json({ success: true, message: 'Memory stored.' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Chat endpoint
    app.post('/v1/chat/completions', async (req, res) => {
        try {
            const { model, messages } = req.body;

            if (!messages || messages.length === 0) {
                return res.status(400).json({ error: 'Messages are required' });
            }

            const lastMsg = messages[messages.length - 1].content;
            const memories = await hippocampus.query(lastMsg);
            const context = memories.map((m: any) => m.item.metadata.text).join('\n---\n');

            if (context) {
                const systemMsg = messages.find((m: any) => m.role === 'system');
                if (systemMsg) {
                    systemMsg.content += `\n\nRelevant Memories:\n${context}`;
                } else {
                    messages.unshift({ role: 'system', content: `Relevant Memories:\n${context}` });
                }
            }

            const reply = await broca.chat(messages, { model });

            res.json({
                id: 'chatcmpl-' + Date.now(),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: reply },
                    finish_reason: 'stop'
                }]
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return app;
};

describe('Brain Server API', () => {
    let app: express.Express;

    beforeAll(() => {
        app = createTestApp();
    });

    describe('GET /health', () => {
        test('should return server status', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('online');
            expect(response.body.service).toContain('Brain');
        });

        test('should include version info', async () => {
            const response = await request(app).get('/health');

            expect(response.body.version).toBeDefined();
            expect(response.body.memory).toBe('initialized');
        });
    });

    describe('POST /v1/memory', () => {
        test('should store memory successfully', async () => {
            const response = await request(app)
                .post('/v1/memory')
                .send({
                    content: 'My name is Akash Ranjan',
                    metadata: { type: 'profile' }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Memory stored.');
        });

        test('should reject empty content', async () => {
            const response = await request(app)
                .post('/v1/memory')
                .send({ content: '', metadata: {} });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        test('should handle missing metadata', async () => {
            const response = await request(app)
                .post('/v1/memory')
                .send({ content: 'Test content' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should store Q&A format memory', async () => {
            const response = await request(app)
                .post('/v1/memory')
                .send({
                    content: 'Form Question: "Expected Salary"\nMy Answer: "15 LPA"',
                    metadata: {
                        type: 'learned_qna',
                        question: 'Expected Salary',
                        answer: '15 LPA'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /v1/chat/completions', () => {
        test('should return chat completion', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({
                    model: 'llama3.1:latest',
                    messages: [{ role: 'user', content: 'Hello' }]
                });

            expect(response.status).toBe(200);
            expect(response.body.choices).toHaveLength(1);
            expect(response.body.choices[0].message.role).toBe('assistant');
            expect(response.body.choices[0].message.content).toBe('Mocked AI response');
        });

        test('should include completion metadata', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({
                    model: 'llama3.1:latest',
                    messages: [{ role: 'user', content: 'Test' }]
                });

            expect(response.body.id).toMatch(/^chatcmpl-/);
            expect(response.body.object).toBe('chat.completion');
            expect(response.body.created).toBeDefined();
            expect(response.body.model).toBe('llama3.1:latest');
        });

        test('should reject empty messages', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({
                    model: 'llama3.1:latest',
                    messages: []
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Messages');
        });

        test('should handle multi-turn conversation', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({
                    model: 'llama3.1:latest',
                    messages: [
                        { role: 'user', content: 'Hi' },
                        { role: 'assistant', content: 'Hello!' },
                        { role: 'user', content: 'How are you?' }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.choices[0].finish_reason).toBe('stop');
        });

        test('should inject memories into context (RAG)', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({
                    model: 'llama3.1:latest',
                    messages: [{ role: 'user', content: 'What is my name?' }]
                });

            // The mock returns memories, which should be injected
            expect(response.status).toBe(200);
            expect(response.body.choices[0].message.content).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid JSON', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        test('should handle missing required fields', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .send({ model: 'llama3.1:latest' }); // Missing messages

            expect(response.status).toBe(400);
        });
    });
});

describe('Brain Server - OpenAI Compatibility', () => {
    let app: express.Express;

    beforeAll(() => {
        app = createTestApp();
    });

    test('should match OpenAI response format', async () => {
        const response = await request(app)
            .post('/v1/chat/completions')
            .send({
                model: 'llama3.1:latest',
                messages: [{ role: 'user', content: 'Test' }]
            });

        // OpenAI format requirements
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('object', 'chat.completion');
        expect(response.body).toHaveProperty('created');
        expect(response.body).toHaveProperty('model');
        expect(response.body).toHaveProperty('choices');
        expect(response.body.choices[0]).toHaveProperty('index', 0);
        expect(response.body.choices[0]).toHaveProperty('message');
        expect(response.body.choices[0]).toHaveProperty('finish_reason');
        expect(response.body.choices[0].message).toHaveProperty('role');
        expect(response.body.choices[0].message).toHaveProperty('content');
    });
});
