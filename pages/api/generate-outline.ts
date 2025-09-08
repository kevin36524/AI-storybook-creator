import type { NextApiRequest, NextApiResponse } from 'next';
import { ai } from '@/lib/server/clients';
import { Type } from '@google/genai';

const storyOutlineSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'The page number, starting from 1.' },
        text: { type: Type.STRING, description: 'The short paragraph of story text for this page. Should be engaging for a child.' }
      },
      required: ['page', 'text']
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a children's story outline based on this idea: "${prompt}". The story should have between 5 and 8 pages.`,
            config: {
                systemInstruction: "You are a creative storyteller for children. Generate a list of story pages. Each page should have a page number and a short paragraph of text. Ensure the story flows well and is age-appropriate.",
                responseMimeType: "application/json",
                responseSchema: storyOutlineSchema,
            }
        });
        if (!response.text) {
            throw new Error("No response text received from the model.");
        }
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        res.status(200).json(parsed);
    } catch (error) {
        console.error('Error in /api/generate-outline:', error);
        res.status(500).json({ error: 'Failed to generate story outline.' });
    }
}
