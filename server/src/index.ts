// FIX: Changed express import to use require syntax to solve a type resolution error on app.use().
import express = require('express');
import cors from 'cors';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Firestore } from '@google-cloud/firestore';

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
// Connect to the specific Firestore database named 'ai-story-creator'.
// The SDK automatically finds the service account credentials when deployed on GCP.
const db = new Firestore({
    databaseId: 'ai-story-creator',
});
const storiesCollection = db.collection('stories');


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));


// --- API ROUTES ---

// File Upload Endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { fileContent, mimeType, isHtml } = req.body;
    
    if (!fileContent || !mimeType) {
      return res.status(400).json({ error: 'Missing file content or mime type.' });
    }

    const fileExtension = isHtml ? 'html' : mimeType.split('/')[1] || 'png';
    const fileName = `uploads/${uuidv4()}.${fileExtension}`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(fileContent, isHtml ? 'utf-8' : 'base64');

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


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
