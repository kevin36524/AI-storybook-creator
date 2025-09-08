import type { NextApiRequest, NextApiResponse } from 'next';
import { ai } from '@/lib/server/clients';
import { Type } from '@google/genai';

const characterSchema = {
    type: Type.OBJECT,
    properties: {
        characters: {
            type: Type.ARRAY,
            description: "A list of the main characters in the story.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's name." },
                    description: { type: Type.STRING, description: "A brief, one-sentence physical description of the character suitable for an image generation prompt." }
                },
                required: ["name", "description"]
            }
        },
        pages: {
            type: Type.ARRAY,
            description: "Mapping of which characters appear on each page.",
            items: {
                type: Type.OBJECT,
                properties: {
                    page: { type: Type.INTEGER, description: "The page number." },
                    characters: {
                        type: Type.ARRAY,
                        description: "A list of character names that appear on this page.",
                        items: { type: Type.STRING }
                    }
                },
                required: ["page", "characters"]
            }
        }
    },
    required: ["characters", "pages"]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        const { pages } = req.body;
        if (!pages || !Array.isArray(pages)) {
            return res.status(400).json({ error: 'Pages array is required.' });
        }
        const storyText = pages.map((p: any) => `Page ${p.page}: ${p.text}`).join('\n');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following children's story and identify the main characters and their appearances on each page.\n\n${storyText}`,
            config: {
                systemInstruction: "You are an expert at analyzing stories to extract structured data. Identify the characters and map them to the pages they appear on.",
                responseMimeType: "application/json",
                responseSchema: characterSchema,
            }
        });
        if (!response.text) {
            throw new Error("No response text received from the model.");
        }
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        res.status(200).json({ characters: parsed.characters || [], pagesWithCharacters: parsed.pages || [] });
    } catch (error) {
        console.error('Error in /api/identify-characters:', error);
        res.status(500).json({ error: 'Failed to identify characters.' });
    }
}
