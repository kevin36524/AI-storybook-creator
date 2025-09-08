// Fix: Use standard ES module imports for Express and CORS.
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Firestore } from '@google-cloud/firestore';
import { GoogleGenAI, Type, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// --- INITIALIZE GCS ---
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  console.error('FATAL ERROR: GCS_BUCKET_NAME environment variable not set.');
  process.exit(1);
}
const bucket = storage.bucket(bucketName);


// --- INITIALIZE FIRESTORE ---
const databaseId = process.env.FIRESTORE_DATABASE_ID;

if (!databaseId) {
    console.error('FATAL ERROR: FIRESTORE_DATABASE_ID environment variable not set.');
    process.exit(1);
}

const db = new Firestore({
    databaseId: databaseId,
});
const storiesCollection = db.collection('stories');

// --- INITIALIZE GEMINI ---
if (!process.env.API_KEY) {
  console.error('FATAL ERROR: API_KEY environment variable not set.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- SCHEMAS (from original geminiService) ---
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


// --- API ROUTES ---

// File Upload Endpoint (Only for final HTML)
app.post('/api/upload', async (req, res) => {
  try {
    const { fileContent, mimeType, isHtml } = req.body;
    
    if (!fileContent || !mimeType) {
      return res.status(400).json({ error: 'Missing file content or mime type.' });
    }

    // Only allow HTML uploads through this endpoint for security and optimization
    if (!isHtml || mimeType !== 'text/html') {
        return res.status(400).json({ error: 'This endpoint only accepts HTML files.' });
    }

    const fileName = `stories/${uuidv4()}.html`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(fileContent, 'utf-8');

    await file.save(buffer, {
      metadata: { contentType: mimeType },
      public: true,
    });

    res.status(200).json({ publicUrl: file.publicUrl() });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file.' });
  }
});

// Save Story to Gallery Endpoint
app.post('/api/stories', async (req, res) => {
    try {
        const { title, author, coverImageUrl, htmlUrl } = req.body;
        if (!title || !author || !coverImageUrl || !htmlUrl) {
            return res.status(400).json({ error: 'Missing required story data.' });
        }

        const newStory = {
            title,
            author,
            // The cover image is a data URI, we don't save it separately
            // We just store the GCS link to the HTML file which contains it
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
});


// Get Public Stories Endpoint
app.get('/api/stories', async (req, res) => {
    try {
        const snapshot = await storiesCollection.orderBy('createdAt', 'desc').get();
        const stories: any[] = [];
        snapshot.forEach(doc => {
            stories.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(stories);
    } catch (error) {
        console.error('Error fetching stories from Firestore:', error);
        res.status(500).json({ error: 'Failed to fetch stories.' });
    }
});

// --- GEMINI PROXY ENDPOINTS ---
app.post('/api/generate-outline', async (req, res) => {
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
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        res.status(200).json(parsed);
    } catch (error) {
        console.error('Error in /api/generate-outline:', error);
        res.status(500).json({ error: 'Failed to generate story outline.' });
    }
});

app.post('/api/identify-characters', async (req, res) => {
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
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        res.status(200).json({ characters: parsed.characters || [], pagesWithCharacters: parsed.pages || [] });
    } catch (error) {
        console.error('Error in /api/identify-characters:', error);
        res.status(500).json({ error: 'Failed to identify characters.' });
    }
});

app.post('/api/generate-character-image', async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) {
            return res.status(400).json({ error: 'Description is required.' });
        }
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A character portrait for a children's storybook. The character is ${description}. The style should be whimsical, vibrant, and colorful, with a simple background.`,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '1:1' },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            res.status(200).json({ imageUrl: `data:image/png;base64,${base64ImageBytes}` });
        } else {
            throw new Error("No image was generated by the model.");
        }
    } catch (error) {
        console.error('Error in /api/generate-character-image:', error);
        res.status(500).json({ error: 'Failed to generate character image.' });
    }
});

app.post('/api/generate-page-image', async (req, res) => {
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

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

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
});

// --- AUDIO GENERATION PROXY ---
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
app.post('/api/generate-audio', async (req, res) => {
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

        if (!elevenLabsResponse.ok) {
            const errorData = await elevenLabsResponse.text();
            console.error('ElevenLabs API Error:', errorData);
            return res.status(elevenLabsResponse.status).json({ error: `Failed to generate audio: ${errorData}` });
        }
        
        // Stream the audio back to the client
        res.setHeader('Content-Type', 'audio/mpeg');
        (elevenLabsResponse.body as any)?.pipe(res);

    } catch (error) {
        console.error('Error in /api/generate-audio:', error);
        res.status(500).json({ error: 'Failed to generate audio.' });
    }
});

// --- STATIC FILE SERVING ---
// This code assumes the frontend has been built into a 'dist' directory at the project root.
const frontendDistPath = path.join(__dirname, '..', '..', 'dist');

// Serve static assets from the 'dist' folder
app.use(express.static(frontendDistPath));

// For any request that doesn't match a static file or an API route,
// serve the main index.html file. This enables client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});