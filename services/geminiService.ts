import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { StoryPage, Character, PublicStory } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


/**
 * Uploads file content to the backend service, which saves it to GCS.
 * @param content The file content (base64 for images, raw string for HTML).
 * @param mimeType The IANA mime type of the content.
 * @param isHtml A flag to indicate if the content is HTML.
 * @returns A promise that resolves to the public URL of the stored file.
 */
export const uploadFile = async (content: string, mimeType: string, isHtml = false): Promise<string> => {
    const BACKEND_URL = '/api/upload';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileContent: content, mimeType, isHtml }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Backend upload failed.');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        console.error('Failed to upload file to cloud:', error);
        throw new Error('Could not save file to cloud storage.');
    }
};

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
    if (!Array.isArray(parsed)) throw new Error("Invalid response format from AI.");
    return parsed.map((item: any, index: number) => ({ page: item.page || index + 1, text: item.text || '' }));
  } catch (error) {
    console.error("Error generating story outline:", error);
    throw new Error("Failed to generate story outline.");
  }
};

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
        return { characters: parsed.characters || [], pagesWithCharacters: parsed.pages || [] };
    } catch (error) {
        console.error("Error identifying characters:", error);
        throw new Error("Failed to identify characters in the story.");
    }
};

export const generateCharacterImage = async (description: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A character portrait for a children's storybook. The character is ${description}. The style should be whimsical, vibrant, and colorful, with a simple background.`,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '1:1' },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return await uploadFile(base64ImageBytes, 'image/png');
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating character image:", error);
        throw new Error("Failed to generate the character illustration.");
    }
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generatePageImageWithReferences = async (page: StoryPage, allCharacters: Character[]): Promise<string> => {
    try {
        const relevantCharacters = allCharacters.filter(c => page.characters?.includes(c.name) && c.imageUrl && c.imageMimeType);
        
        const textPart = { text: `Create a whimsical, vibrant, and colorful illustration for a children's storybook. The scene is: "${page.text}". Use the provided images as a direct reference for the characters' appearance. The characters should look exactly like the reference images. Ensure the final image matches the storybook art style. Do not include any text in the image.` };
        
        const imageParts = await Promise.all(relevantCharacters.map(async (char) => {
             const base64Data = await fetchImageAsBase64(char.imageUrl!);
             return {
                inlineData: {
                    data: base64Data,
                    mimeType: char.imageMimeType!,
                }
            };
        }));
        
        const parts = [textPart, ...imageParts];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            return await uploadFile(base64ImageBytes, mimeType);
        } else {
            throw new Error("No image was generated in the response.");
        }
    } catch (error) {
        console.error("Error generating page image:", error);
        throw new Error("Failed to generate the page illustration.");
    }
};

export const saveHtmlToCloud = async (htmlContent: string): Promise<string> => {
    return uploadFile(htmlContent, 'text/html', true);
};

// --- Story Sharing ---
export const shareStory = async (storyData: Omit<PublicStory, 'id'>): Promise<void> => {
    const BACKEND_URL = '/api/stories';
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storyData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to share story.');
        }
    } catch (error) {
        console.error('Error sharing story:', error);
        throw new Error('Could not share the story.');
    }
};

export const getPublicStories = async (): Promise<PublicStory[]> => {
    const BACKEND_URL = '/api/stories';
    try {
        const response = await fetch(BACKEND_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch public stories.');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching public stories:', error);
        throw new Error('Could not load the story gallery.');
    }
};

// --- Audio Generation ---
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
// A hardcoded key is used for simplicity in this environment.
// In a real-world application, this should be handled via secure environment variables.
const ELEVENLABS_APIKEY = `sk_8abf8e0ac764664578f4364993808820a2755de0b3d5c704`;

export const generateAudioForText = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || ELEVENLABS_APIKEY;
  if (!apiKey) throw new Error("ElevenLabs API key is not configured.");
  const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ElevenLabs API Error: ${errorData.detail?.message || response.statusText}`);
    }
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Error generating audio from ElevenLabs:", error);
    throw new Error("Failed to create audio for the story page.");
  }
};