// FIX: Import Express types to resolve overload errors with route handlers and middleware.
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Firestore } from '@google-cloud/firestore';

// FIX: Explicitly type the express app to ensure correct type inference for its methods.
const app: Express = express();
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


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));


// --- API ROUTES ---

// File Upload Endpoint (Only for final HTML)
app.post('/api/upload', async (req: Request, res: Response) => {
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
app.post('/api/stories', async (req: Request, res: Response) => {
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
app.get('/api/stories', async (req: Request, res: Response) => {
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

// --- STATIC FILE SERVING ---
// Serve the built frontend assets
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// For any other request, serve the index.html file for client-side routing
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});