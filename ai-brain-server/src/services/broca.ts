import axios from 'axios';
import { logger } from '../utils/logger';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatOptions {
    model: string;
    temperature?: number;
}

export class BrocaService {
    private ollamaUrl: string;
    private geminiKey: string;

    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.geminiKey = process.env.GEMINI_API_KEY || '';
    }

    async chat(messages: Message[], options: ChatOptions): Promise<string> {
        const { model } = options;

        if (model.startsWith('gemini')) {
            return this.callGemini(messages, model);
        } else {
            return this.callOllama(messages, model);
        }
    }

    private async callOllama(messages: Message[], model: string): Promise<string> {
        try {
            logger.info(`Calling Ollama: ${model}`, { service: 'BROCA' });
            const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
                model: model,
                messages: messages,
                stream: false,
                options: { temperature: 0.3 }
            });

            return response.data.message.content;
            return response.data.message.content;
        } catch (error: any) {
            const errorDetails = {
                message: error.message,
                code: error.code,
                url: `${this.ollamaUrl}/api/chat`,
                response: error.response?.data
            };
            logger.error(`Ollama Error: ${error.message}`, { service: 'BROCA', details: errorDetails });
            throw new Error(`Ollama Failed: ${error.message}`);
        }
    }

    private async callGemini(messages: Message[], model: string): Promise<string> {
        if (!this.geminiKey) throw new Error('GEMINI_API_KEY not set');

        try {
            console.log(`[Broca] Calling Gemini: ${model}`);
            const lastMsg = messages[messages.length - 1];
            const systemMsg = messages.find(m => m.role === 'system')?.content || '';
            const prompt = systemMsg ? `System: ${systemMsg}\nUser: ${lastMsg.content}` : lastMsg.content;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;

            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (error: any) {
            console.error('[Broca] Gemini Error:', error.response?.data?.error?.message || error.message);
            throw new Error(`Gemini Failed`);
        }
    }
}
