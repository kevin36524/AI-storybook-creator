import type { NextApiRequest, NextApiResponse } from 'next';

const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required for audio generation.' });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            console.error('ELEVENLABS_API_KEY environment variable not set.');
            return res.status(500).json({ error: 'Audio generation service is not configured.' });
        }
        
        const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
        const elevenLabsResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_turbo_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        });

        if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
            const errorData = await elevenLabsResponse.text();
            console.error('ElevenLabs API Error:', errorData);
            return res.status(elevenLabsResponse.status).json({ error: `Failed to generate audio: ${errorData}` });
        }
        
        res.setHeader('Content-Type', 'audio/mpeg');
        const buffer = await elevenLabsResponse.arrayBuffer();
        res.status(200).send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error in /api/generate-audio:', error);
        res.status(500).json({ error: 'Failed to generate audio.' });
    }
}
