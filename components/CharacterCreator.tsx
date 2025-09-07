import React, { useState, useRef, ChangeEvent } from 'react';
import type { Character } from '../types';
import { generateCharacterImage } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import { MagicWandIcon, UserIcon, PhotoIcon, CheckCircleIcon } from './icons/Icons';

interface CharacterCreatorProps {
  characters: Character[];
  onComplete: (characters: Character[]) => void;
}

const fileToDataUri = (file: File): Promise<{ data: string, mimeType: string }> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({ data: base64String, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const CharacterCard: React.FC<{
    character: Character;
    onUpdate: (updatedCharacter: Character) => void;
}> = ({ character, onUpdate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateImage = async () => {
        setIsLoading(true);
        try {
            const imageUrl = await generateCharacterImage(character.description);
            // We need the raw base64 data, not the data URI
            const base64Data = imageUrl.split(',')[1];
            onUpdate({ ...character, imageUrl: base64Data, imageMimeType: 'image/png' });
        } catch (error) {
            console.error("Failed to generate character image:", error);
            // You could add error state handling here
        }
        setIsLoading(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            try {
                const { data, mimeType } = await fileToDataUri(file);
                onUpdate({ ...character, imageUrl: data, imageMimeType: mimeType });
            } catch (error) {
                console.error("Failed to process file:", error);
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/60 p-6 rounded-2xl shadow-md border border-amber-200">
            <div className="grid sm:grid-cols-2 gap-6 items-center">
                <div className="w-full aspect-square rounded-xl shadow-lg overflow-hidden flex items-center justify-center bg-amber-100">
                    {isLoading ? (
                        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                    ) : character.imageUrl ? (
                        <img src={`data:${character.imageMimeType};base64,${character.imageUrl}`} alt={character.name} className="w-full h-full object-cover"/>
                    ) : (
                        <UserIcon />
                    )}
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-700">{character.name}</h3>
                    <p className="text-slate-500 italic">"{character.description}"</p>
                    <div className="pt-2 flex flex-col gap-3">
                        <Button onClick={handleGenerateImage} variant="secondary" isLoading={isLoading} disabled={isLoading}>
                            <MagicWandIcon /> Create with AI
                        </Button>
                        <Button onClick={handleUploadClick} variant="secondary" disabled={isLoading}>
                            <PhotoIcon /> Upload Photo
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                    </div>
                </div>
            </div>
        </div>
    );
};


const CharacterCreator: React.FC<CharacterCreatorProps> = ({ characters, onComplete }) => {
    const [characterList, setCharacterList] = useState<Character[]>(characters);

    const handleCharacterUpdate = (updatedCharacter: Character) => {
        setCharacterList(prevList =>
            prevList.map(c => c.name === updatedCharacter.name ? updatedCharacter : c)
        );
    };

    const allCharactersReady = characterList.every(c => c.imageUrl);

    return (
        <Card className="animate-fade-in">
             <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-700 mb-2">Let's Meet Your Characters!</h2>
                <p className="text-slate-500 mb-8">Create a look for each character in your story.</p>
            </div>

            {characterList.length > 0 ? (
                <div className="space-y-6">
                    {characterList.map(char => (
                        <CharacterCard key={char.name} character={char} onUpdate={handleCharacterUpdate} />
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 bg-amber-50 rounded-xl">
                    <p className="text-slate-600">No main characters were identified in this story. You can proceed directly to creating the pages!</p>
                </div>
            )}
            
            <div className="mt-8 flex justify-center">
                <Button onClick={() => onComplete(characterList)} variant="success" disabled={!allCharactersReady && characterList.length > 0}>
                    <CheckCircleIcon />
                    All set, let's draw!
                </Button>
            </div>
        </Card>
    );
};

export default CharacterCreator;
