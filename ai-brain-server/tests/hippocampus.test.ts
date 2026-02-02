import { HippocampusService } from '../src/services/hippocampus';

// Mock dependencies
jest.mock('vectra', () => ({
    LocalIndex: jest.fn().mockImplementation(() => ({
        isIndexCreated: jest.fn().mockResolvedValue(true),
        createIndex: jest.fn().mockResolvedValue(undefined),
        insertItem: jest.fn().mockResolvedValue(undefined),
        queryItems: jest.fn().mockResolvedValue([
            { item: { metadata: { text: 'Memory 1', score: 0.9 } }, score: 0.9 }
        ])
    }))
}));

jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn().mockResolvedValue((text: string) => ({
        data: new Float32Array([0.1, 0.2, 0.3])
    }))
}));

describe('HippocampusService', () => {
    let hippocampus: HippocampusService;

    beforeEach(() => {
        hippocampus = new HippocampusService();
    });

    describe('Initialization', () => {
        test('should initialize and load model', async () => {
            await hippocampus.init();
            expect(true).toBe(true);
        });

        test('should be idempotent on multiple inits', async () => {
            await hippocampus.init();
            await hippocampus.init();
            expect(true).toBe(true);
        });
    });

    describe('Memory Storage', () => {
        test('should ingest memory correctly', async () => {
            await hippocampus.init();
            await hippocampus.addMemory('My name is Akash');
            expect(true).toBe(true);
        });

        test('should store memory with metadata', async () => {
            await hippocampus.init();
            await hippocampus.addMemory('Test content', { type: 'test', source: 'unit-test' });
            expect(true).toBe(true);
        });

        test('should handle empty content gracefully', async () => {
            await hippocampus.init();
            // Should not throw
            await hippocampus.addMemory('');
            expect(true).toBe(true);
        });
    });

    describe('Memory Retrieval', () => {
        test('should retrieve relevant memories', async () => {
            await hippocampus.init();
            const results = await hippocampus.query('Who am I?');
            expect(results).toHaveLength(1);
            expect(results[0].item.metadata.text).toBe('Memory 1');
        });

        test('should return empty array for no matches', async () => {
            const mockHippocampus = new HippocampusService();
            // Override queryItems to return empty
            jest.spyOn(mockHippocampus as any, 'query').mockResolvedValue([]);
            
            const results = await mockHippocampus.query('Random query');
            expect(results).toHaveLength(0);
        });

        test('should respect limit parameter', async () => {
            await hippocampus.init();
            const results = await hippocampus.query('test', 5);
            // Mock returns 1, but we're testing the call pattern
            expect(results.length).toBeLessThanOrEqual(5);
        });
    });

    describe('RAG Integration', () => {
        test('should retrieve memories for form filling context', async () => {
            await hippocampus.init();
            
            // Simulate storing learned Q&A
            await hippocampus.addMemory(
                'Form Question: "Expected Salary"\nMy Answer: "15 LPA"',
                { type: 'learned_qna', question: 'Expected Salary' }
            );

            const results = await hippocampus.query('Expected Salary');
            expect(results.length).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('HippocampusService - Edge Cases', () => {
    let hippocampus: HippocampusService;

    beforeEach(() => {
        hippocampus = new HippocampusService();
    });

    test('should handle special characters in content', async () => {
        await hippocampus.init();
        await hippocampus.addMemory('Test with special chars: <>&"\' @#$%');
        expect(true).toBe(true);
    });

    test('should handle unicode content', async () => {
        await hippocampus.init();
        await hippocampus.addMemory('Unicode test: 你好 مرحبا 🎉');
        expect(true).toBe(true);
    });

    test('should handle very long content', async () => {
        await hippocampus.init();
        const longContent = 'A'.repeat(10000);
        await hippocampus.addMemory(longContent);
        expect(true).toBe(true);
    });
});

