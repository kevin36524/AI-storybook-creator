export interface StoryPage {
  page: number;
  text: string;
  imageUrl?: string;
  characters?: string[];
  audioUrl?: string;
}

export interface Character {
    name: string;
    description: string;
    imageUrl?: string;
    imageMimeType?: string;
}