import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { StoryPage, Character } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Story Outline Generation ---

const storyOutlineSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      page: {
        type: Type.INTEGER,
        description: 'The page number, starting from 1.'
      },
      text: {
        type: Type.STRING,
        description: 'The short paragraph of story text for this page. Should be engaging for a child.'
      }
    },
    required: ['page', 'text']
  }
};

export const generateStoryOutline = async (prompt: string): Promise<StoryPage[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a children's story outline based on this idea: "${prompt}". The story should have between 5 and 8 pages.`,
      config: {
        systemInstruction: "You are a creative storyteller for children. Generate a list of story pages. Each page should have a page number and a short paragraph of text. Ensure the story flows well and is age-appropriate.",
        responseMimeType: "application/json",
        responseSchema: storyOutlineSchema,
      }
    });
    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed)) {
        throw new Error("Invalid response format from AI. Expected an array.");
    }

    return parsed.map((item: any, index: number) => ({
        page: item.page || index + 1,
        text: item.text || ''
    }));

  } catch (error) {
    console.error("Error generating story outline:", error);
    throw new Error("Failed to generate story outline.");
  }
};

// --- Character Identification ---

const characterSchema = {
    type: Type.OBJECT,
    properties: {
        characters: {
            type: Type.ARRAY,
            description: "A list of all main characters in the story.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "The character's name."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A short, visual description of the character (e.g., 'a small brown mouse with a red backpack')."
                    }
                },
                required: ["name", "description"]
            }
        },
        pages: {
            type: Type.ARRAY,
            description: "An array linking characters to each page they appear on.",
            items: {
                type: Type.OBJECT,
                properties: {
                    page: {
                        type: Type.INTEGER,
                        description: "The page number."
                    },
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


export const identifyCharactersAndPages = async (pages: StoryPage[]): Promise<{ characters: Character[]; pagesWithCharacters: { page: number; characters: string[] }[] }> => {
    const storyText = pages.map(p => `Page ${p.page}: ${p.text}`).join('\n');
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following children's story and identify the main characters and their appearances on each page.\n\n${storyText}`,
            config: {
                systemInstruction: "You are an expert at analyzing stories to extract structured data. Identify the characters and map them to the pages they appear on.",
                responseMimeType: "application/json",
                responseSchema: characterSchema,
            }
        });
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        return {
            characters: parsed.characters || [],
            pagesWithCharacters: parsed.pages || []
        };
    } catch (error) {
        console.error("Error identifying characters:", error);
        throw new Error("Failed to identify characters in the story.");
    }
};

// --- Image Generation ---

export const generateCharacterImage = async (description: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A character portrait for a children's storybook. The character is ${description}. The style should be whimsical, vibrant, and colorful, with a simple background.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating character image:", error);
        throw new Error("Failed to generate the character illustration.");
    }
};

export const generatePageImageWithReferences = async (page: StoryPage, allCharacters: Character[]): Promise<string> => {
    try {
        const relevantCharacters = allCharacters.filter(c => page.characters?.includes(c.name) && c.imageUrl && c.imageMimeType);
        
        const parts: any[] = [
            { text: `Create a whimsical, vibrant, and colorful illustration for a children's storybook. The scene is: "${page.text}". Use the provided images as a direct reference for the characters' appearance. Ensure the final image matches the storybook art style. Do not include any text in the image.` }
        ];

        relevantCharacters.forEach(char => {
            parts.push({
                inlineData: {
                    data: char.imageUrl!,
                    mimeType: char.imageMimeType!,
                }
            });
        });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated in the response.");
        }
    } catch (error) {
        console.error("Error generating page image:", error);
        throw new Error("Failed to generate the page illustration.");
    }
};
