import type { StoryPage, Character, PublicStory } from '../types';

/**
 * A helper function to streamline fetch requests and handle errors consistently.
 * @param url The API endpoint to call.
 * @param options The fetch options (method, headers, body, etc.).
 * @returns A promise that resolves to the fetch Response object.
 * @throws An error if the network response is not OK.
 */
async function fetchApi(url: string, options: RequestInit): Promise<Response> {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
            throw new Error(errorData.error || 'An unknown network error occurred.');
        }
        return response;
    } catch (error) {
        console.error(`API call to ${url} failed:`, error);
        // Re-throw the error to be caught by the calling function's try/catch block
        throw error;
    }
}


/**
 * Uploads a file (HTML) to the backend service, which saves it to GCS.
 * @param content The file content (raw string for HTML).
 * @param mimeType The IANA mime type of the content.
 * @param isHtml A flag to indicate if the content is HTML.
 * @returns A promise that resolves to the public URL of the stored file.
 */
export const uploadFile = async (content: string, mimeType: string, isHtml = false): Promise<string> => {
    const response = await fetchApi('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: content, mimeType, isHtml }),
    });
    const { publicUrl } = await response.json();
    return publicUrl;
};

export const generateStoryOutline = async (prompt: string): Promise<StoryPage[]> => {
    const response = await fetchApi('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
    return response.json();
};

export const identifyCharactersAndPages = async (pages: StoryPage[]): Promise<{ characters: Character[]; pagesWithCharacters: { page: number; characters: string[] }[] }> => {
    const response = await fetchApi('/api/identify-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
    });
    return response.json();
};

export const generateCharacterImage = async (description: string): Promise<string> => {
    const response = await fetchApi('/api/generate-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
    });
    const { imageUrl } = await response.json();
    return imageUrl;
};

export const generatePageImageWithReferences = async (page: StoryPage, allCharacters: Character[]): Promise<string> => {
    const response = await fetchApi('/api/generate-page-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, allCharacters }),
    });
    const { imageUrl } = await response.json();
    return imageUrl;
};


export const saveHtmlToCloud = async (htmlContent: string): Promise<string> => {
    return uploadFile(htmlContent, 'text/html', true);
};

// --- Story Sharing ---
export const shareStory = async (storyData: Omit<PublicStory, 'id'>): Promise<void> => {
    await fetchApi('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
    });
};

export const getPublicStories = async (): Promise<PublicStory[]> => {
    const response = await fetchApi('/api/stories', { method: 'GET' });
    return response.json();
};

// --- Audio Generation ---
export const generateAudioForText = async (text: string): Promise<string> => {
    const response = await fetchApi('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
};
