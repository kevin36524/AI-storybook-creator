import type { NextApiRequest, NextApiResponse } from 'next';
import { ai } from '@/lib/server/clients';
import { Modality } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { page, allCharacters } = req.body;
        if (!page || !allCharacters) {
            return res.status(400).json({ error: 'Page and allCharacters are required.' });
        }

        const relevantCharacters = allCharacters.filter((c: any) => page.characters?.includes(c.name) && c.imageUrl && c.imageMimeType);
        
        const textPart = { text: `Create a whimsical, vibrant, and colorful illustration for a children's storybook. The scene is: "${page.text}". Use the provided images as a direct reference for the characters' appearance. The characters should look exactly like the reference images. Ensure the final image matches the storybook art style. Do not include any text in the image.` };
        
        const imageParts = relevantCharacters.map((char: any) => {
            const base64Data = char.imageUrl!.substring(char.imageUrl!.indexOf(',') + 1);
            return {
                inlineData: { data: base64Data, mimeType: char.imageMimeType! }
            };
        });
        
        const parts = [textPart, ...imageParts];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            res.status(200).json({ imageUrl: `data:${mimeType};base64,${base64ImageBytes}` });
        } else {
            throw new Error("No image was generated in the response from the model.");
        }
    } catch (error) {
        console.error('Error in /api/generate-page-image:', error);
        res.status(500).json({ error: 'Failed to generate page image.' });
    }
}
