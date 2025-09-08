import type { NextApiRequest, NextApiResponse } from 'next';
import { bucket } from '@/lib/server/clients';
import { v4 as uuidv4 } from 'uuid';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '30mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { fileContent, mimeType, isHtml } = req.body;
        
        if (!fileContent || !mimeType) {
          return res.status(400).json({ error: 'Missing file content or mime type.' });
        }
    
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
}
