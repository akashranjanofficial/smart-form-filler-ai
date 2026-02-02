const axios = require('axios');
const fs = require('fs');

const PROFILE_PATH = '../../Documents/jobfiller-profile-2026-01-31.json';
const API_URL = 'http://localhost:3000/v1/memory';

async function ingest() {
    try {
        const data = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
        const profile = data.profile;
        const experience = data.experience;
        const education = data.education;
        const resume = data.documents?.resume;

        console.log('🧠 Ingesting Profile into AI Brain...');

        // 1. Ingest Resume (High value)
        if (resume) {
            console.log('-> Ingesting Resume...');
            await axios.post(API_URL, {
                content: `Resume: ${resume}`,
                metadata: { type: 'resume', source: 'profile.json' }
            });
        }

        // 2. Ingest Experience (Specifics)
        for (const job of experience) {
            console.log(`-> Ingesting Job: ${job.title} at ${job.company}`);
            const text = `Experience: Worked as ${job.title} at ${job.company} (${job.startDate} - ${job.current ? 'Present' : job.endDate}). Description: ${job.description}`;
            await axios.post(API_URL, {
                content: text,
                metadata: { type: 'experience', company: job.company }
            });
        }

        // 3. Ingest Education
        for (const edu of education) {
            console.log(`-> Ingesting Education: ${edu.institution}`);
            const text = `Education: ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate} - ${edu.endDate}). GPA: ${edu.gpa}`;
            await axios.post(API_URL, {
                content: text,
                metadata: { type: 'education', school: edu.institution }
            });
        }

        console.log('✅ Memory Ingestion Complete!');

    } catch (e) {
        console.error('Error:', e.message);
    }
}

ingest();
