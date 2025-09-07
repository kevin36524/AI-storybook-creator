import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { StoryPage, Character } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


/**
 * Placeholder for saving an an image to a cloud service like Google Cloud Storage.
 * In a real application, this function would:
 * 1. Take the base64 image data.
 * 2. Send it to a secure backend endpoint.
 * 3. The backend would then upload the image to a GCS bucket.
 * 4. The backend would return the public URL of the uploaded image.
 *
 * @param base64ImageData The base64 encoded image data string.
 * @param mimeType The mime type of the image (e.g., 'image/png').
 * @returns A promise that resolves to the public URL of the stored image.
 */
const saveImageToCloud = async (base64ImageData: string, mimeType: string): Promise<string> => {
    console.log("Attempting to save image to cloud...");
    // This is a simulation. In a real app, you would make an API call here.
    // We are returning the data URI directly for now so the app can function.
    // Replace this with your actual backend logic.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    console.log("Image 'saved' to cloud. In a real app, this would be a public URL.");
    return `data:${mimeType};base64,${base64ImageData}`;
};


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
            // In a real app, you might want to await this, but we'll fire-and-forget
            // for this simulation to keep the UI responsive.
            saveImageToCloud(base64ImageBytes, 'image/png');
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
            // Fire-and-forget the cloud save operation.
            saveImageToCloud(base64ImageBytes, mimeType);
            return `data:${mimeType};base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated in the response.");
        }
    } catch (error) {
        console.error("Error generating page image:", error);
        throw new Error("Failed to generate the page illustration.");
    }
};

// --- Audio Generation ---

const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - A good default storyteller voice
const ELEVENLABS_APIKEY = `sk_8abf8e0ac764664578f4364993808820a2755de0b3d5c704`;

export const generateAudioForText = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || ELEVENLABS_APIKEY;
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured. Please add it as a secret named ELEVENLABS_API_KEY.");
  }

  const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        // Using turbo model for speed, as per request for "flash"
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
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