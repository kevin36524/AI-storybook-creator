import express, { json } from 'express';
import cors from 'cors';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 8080;

// Initialize GCS
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  console.error('FATAL ERROR: GCS_BUCKET_NAME environment variable not set.');
  process.exit(1);
}

const bucket = storage.bucket(bucketName);

// Middleware
app.use(cors());
// Increase payload size limit for base64 images and HTML content
// FIX: Use the named `json` import from express to resolve a type overload issue. This requires updating the express import statement as well.
app.use(json({ limit: '10mb' }));

app.post('/api/upload', async (req, res) => {
  try {
    const { fileContent, mimeType, isHtml } = req.body;
    
    if (!fileContent || !mimeType) {
      return res.status(400).json({ error: 'Missing file content or mime type.' });
    }

    const fileExtension = isHtml ? 'html' : mimeType.split('/')[1] || 'png';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const file = bucket.file(fileName);

    // Decode content differently if it's a base64 image or a raw HTML string
    const buffer = Buffer.from(fileContent, isHtml ? 'utf-8' : 'base64');

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
      public: true, // Make the file public upon upload
    });

    const publicUrl = file.publicUrl();

    res.status(200).json({ publicUrl });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
