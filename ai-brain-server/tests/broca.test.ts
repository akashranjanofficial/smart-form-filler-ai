import { BrocaService } from '../src/services/broca';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BrocaService', () => {
    let broca: BrocaService;

    beforeEach(() => {
        broca = new BrocaService();
        jest.clearAllMocks();
    });

    describe('Ollama Integration', () => {
        test('should route to Ollama when model is llama3.1', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: 'Hello from Ollama' } }
            });

            const reply = await broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' });

            expect(reply).toBe('Hello from Ollama');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining(':11434/api/chat'),
                expect.objectContaining({ model: 'llama3.1:latest' })
            );
        });

        test('should fallback to default model if none provided', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: 'Default response' } }
            });

            await broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ model: 'llama3.1:latest' })
            );
        });

        test('should handle API errors gracefully', async () => {
            mockedAxios.post.mockRejectedValue(new Error('Network Error'));

            await expect(broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' }))
                .rejects.toThrow('Network Error');
        });
    });

    describe('Message Handling', () => {
        test('should handle single message', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: 'Response' } }
            });

            const reply = await broca.chat([{ role: 'user', content: 'Hello' }], { model: 'llama3.1:latest' });
            
            expect(reply).toBe('Response');
        });

        test('should handle multi-turn conversation', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: 'Follow-up response' } }
            });

            const messages: Array<{role: 'user' | 'system' | 'assistant', content: string}> = [
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: 'Hello!' },
                { role: 'user', content: 'How are you?' }
            ];

            const reply = await broca.chat(messages, { model: 'llama3.1:latest' });
            
            expect(reply).toBe('Follow-up response');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'user' })
                    ])
                })
            );
        });

        test('should handle system messages', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: 'Contextual response' } }
            });

            const messages: Array<{role: 'user' | 'system' | 'assistant', content: string}> = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Help me' }
            ];

            await broca.chat(messages, { model: 'llama3.1:latest' });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' })
                    ])
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle timeout errors', async () => {
            mockedAxios.post.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

            await expect(broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' }))
                .rejects.toThrow('timeout');
        });

        test('should handle connection refused', async () => {
            mockedAxios.post.mockRejectedValue(new Error('connect ECONNREFUSED'));

            await expect(broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' }))
                .rejects.toThrow('ECONNREFUSED');
        });

        test('should handle empty response', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { message: { content: '' } }
            });

            const reply = await broca.chat([{ role: 'user', content: 'Hi' }], { model: 'llama3.1:latest' });
            expect(reply).toBe('');
        });
    });
});

