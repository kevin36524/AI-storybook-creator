
import { GoogleGenAI, Type } from "@google/genai";
import type { StoryPage } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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


export const generateImagePrompt = async (pageText: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following story text, create a detailed and vivid image generation prompt: "${pageText}"`,
            config: {
                systemInstruction: "You are an expert in writing prompts for AI image generation, specializing in children's storybook illustrations. The style should be whimsical, vibrant, colorful, and enchanting. Describe the scene, characters, emotions, and background in detail. Focus on a single, clear image. Do not include any text in the image.",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating image prompt:", error);
        throw new Error("Failed to generate image prompt.");
    }
};


export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
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
        console.error("Error generating image:", error);
        throw new Error("Failed to generate the illustration.");
    }
};
