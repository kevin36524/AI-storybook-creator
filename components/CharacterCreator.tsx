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

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
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
            const dataUri = await generateCharacterImage(character.description);
            onUpdate({ ...character, imageUrl: dataUri, imageMimeType: 'image/png' });
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
                const dataUri = await fileToDataUri(file);
                onUpdate({ ...character, imageUrl: dataUri, imageMimeType: file.type });
            } catch (error) {
                console.error("Failed to process file:", error);
            }
            setIsLoading(false);
        }
    };

    const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ ...character, description: e.target.value });
    };

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-2xl shadow-md border border-amber-200 dark:border-amber-800">
            <div className="grid sm:grid-cols-2 gap-6 items-center">
                <div className="w-full aspect-square rounded-xl shadow-lg overflow-hidden flex items-center justify-center bg-amber-100 dark:bg-slate-700">
                    {isLoading ? (
                        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                    ) : character.imageUrl ? (
                        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover"/>
                    ) : (
                        <UserIcon />
                    )}
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{character.name}</h3>
                    <textarea 
                        value={character.description}
                        onChange={handleDescriptionChange}
                        className="w-full h-24 p-2 border border-amber-300 rounded-lg bg-white/50 dark:bg-slate-700/50 dark:border-amber-700 focus:ring-2 focus:ring-rose-400 transition"
                        placeholder="Edit character description..."
                    />
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
                <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">Let's Meet Your Characters!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Create a look for each character in your story.</p>
            </div>

            {characterList.length > 0 ? (
                <div className="space-y-6">
                    {characterList.map(char => (
                        <CharacterCard key={char.name} character={char} onUpdate={handleCharacterUpdate} />
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 bg-amber-50 rounded-xl dark:bg-slate-800">
                    <p className="text-slate-600 dark:text-slate-300">No main characters were identified in this story. You can proceed directly to creating the pages!</p>
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