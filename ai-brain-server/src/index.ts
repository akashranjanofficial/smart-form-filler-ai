import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json } from 'body-parser';

dotenv.config();

import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Logs Endpoint for Extension
app.post('/logs', (req, res) => {
    const { level, message, service } = req.body;
    logger.log({
        level: level || 'info',
        message: message,
        service: service || 'EXTENSION'
    });
    res.json({ success: true });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'AI Brain (Exocortex)',
        version: '1.0.0',
        memory: 'initialized'
    });
});

// Brain Components
import { BrocaService } from './services/broca';
import { HippocampusService } from './services/hippocampus';

const broca = new BrocaService();
const hippocampus = new HippocampusService();

// Initialize Memory on Start
hippocampus.init().catch(err => console.error('Memory Init Failed:', err));

// Memory Ingestion Endpoint
app.post('/v1/memory', async (req, res) => {
    try {
        const { content, metadata } = req.body;
        await hippocampus.addMemory(content, metadata);
        res.json({ success: true, message: 'Memory stored.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/v1/chat/completions', async (req, res) => {
    try {
        const { model, messages } = req.body;

        // RAG: Retrieve Context
        const lastMsg = messages[messages.length - 1].content;
        const memories = await hippocampus.query(lastMsg);
        const context = memories.map(m => m.item.metadata.text).join('\n---\n');

        console.log(`[Brain] Retrieved ${memories.length} relevant memories.`);

        // Inject Context
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
                message: {
                    role: 'assistant',
                    content: reply
                },
                finish_reason: 'stop'
            }]
        });
    } catch (error: any) {
        console.error('Error processing chat:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    logger.info(`Brain Server running on port ${port}`, { service: 'SYSTEM' });
    console.log(`Server running on http://localhost:${port}`);
});
