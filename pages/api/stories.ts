import type { NextApiRequest, NextApiResponse } from 'next';
import { storiesCollection } from '@/lib/server/clients';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            await getPublicStories(req, res);
            break;
        case 'POST':
            await saveStory(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

const getPublicStories = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const snapshot = await storiesCollection.orderBy('createdAt', 'desc').limit(20).get();
        const stories: any[] = [];
        snapshot.forEach(doc => {
            stories.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(stories);
    } catch (error) {
        console.error('Error fetching stories from Firestore:', error);
        res.status(500).json({ error: 'Failed to fetch stories.' });
    }
};

const saveStory = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const { title, author, coverImageUrl, htmlUrl } = req.body;
        if (!title || !author || !coverImageUrl || !htmlUrl) {
            return res.status(400).json({ error: 'Missing required story data.' });
        }

        const newStory = {
            title,
            author,
            coverImageUrl, 
            htmlUrl,
            createdAt: new Date(),
        };

        const docRef = await storiesCollection.add(newStory);
        res.status(201).json({ id: docRef.id, ...newStory });

    } catch (error) {
        console.error('Error saving story to Firestore:', error);
        res.status(500).json({ error: 'Failed to save story.' });
    }
};
