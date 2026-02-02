import { LocalIndex } from 'vectra';
import path from 'path';
import { logger } from '../utils/logger';

// Use a real embedding model or a mock/local one
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

export class HippocampusService {
    private index: LocalIndex;
    private pipeline: any; // Changed from extractor to pipeline
    private initialized: boolean = false;

    constructor() {
        const indexFolder = path.join(process.cwd(), 'memory_index');
        this.index = new LocalIndex(indexFolder);
    }

    async init() {
        if (this.initialized) return;

        logger.info('Loading Embedding Model (MiniLM)...', { service: 'HIPPOCAMPUS' });
        // @ts-ignore
        const { pipeline } = await import('@xenova/transformers');
        this.pipeline = await pipeline('feature-extraction', MODEL_NAME);

        logger.info('Checking Vector Index...', { service: 'HIPPOCAMPUS' });
        const indexPath = path.join(process.cwd(), 'memory_index');

        this.index = new LocalIndex(indexPath);

        if (!await this.index.isIndexCreated()) {
            await this.index.createIndex();
        }

        this.initialized = true;
        logger.info('Memory System Online.', { service: 'HIPPOCAMPUS' });
    }

    async addMemory(text: string, metadata: any = {}) {
        if (!this.initialized) await this.init();

        const vector = await this.getEmbedding(text);

        await this.index.insertItem({
            vector,
            metadata: { text, timestamp: Date.now() }
        });
        logger.info(`Memorized: "${text.substring(0, 20)}..."`, { service: 'HIPPOCAMPUS' });
    }

    async query(text: string, limit = 3) {
        if (!this.initialized) await this.init();
        const vector = await this.getEmbedding(text); // Restore this line
        // queryItems(vector, queryText, limit)
        // Correct signature: (vector, text, limit)
        return await this.index.queryItems(vector, "", limit);
    }

    private async getEmbedding(text: string): Promise<number[]> {
        // @ts-ignore
        const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
}
