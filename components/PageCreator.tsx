import React, { useState, useEffect, useCallback } from 'react';
import { generatePageImageWithReferences } from '../services/geminiService';
import type { StoryPage, Character } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { ArrowPathIcon, PaintBrushIcon, CheckCircleIcon } from './icons/Icons';

interface PageCreatorProps {
  page: StoryPage;
  allCharacters: Character[];
  pageIndex: number;
  totalPages: number;
  onPageComplete: (pageIndex: number, imageUrl: string) => void;
  onPageTextChange: (pageIndex: number, newText: string) => void;
}

const ImagePlaceholder: React.FC = () => (
    <div className="w-full aspect-square bg-rose-100 rounded-2xl flex items-center justify-center">
        <PaintBrushIcon />
    </div>
);


const PageCreator: React.FC<PageCreatorProps> = ({ page, allCharacters, pageIndex, totalPages, onPageComplete, onPageTextChange }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const createImageForPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const generatedImageUrl = await generatePageImageWithReferences(page, allCharacters);
      setImageUrl(generatedImageUrl);
    } catch (err) {
      console.error(err);
      setError("The magic paintbrush slipped! Let's try drawing that again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, allCharacters]);

  useEffect(() => {
    createImageForPage();
  }, [createImageForPage]);
  
  const handleApprove = () => {
    if(imageUrl) {
        onPageComplete(pageIndex, imageUrl);
    }
  };

  return (
    <Card className="animate-fade-in">
        <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200">Creating Page {pageIndex + 1} of {totalPages}</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 dark:bg-gray-700">
              <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}></div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <h3 className="font-bold text-rose-500 dark:text-rose-400 text-xl">Story Text (Editable)</h3>
                <textarea
                  value={page.text}
                  onChange={(e) => onPageTextChange(pageIndex, e.target.value)}
                  className="w-full h-40 p-4 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition duration-300 resize-none bg-amber-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-amber-800"
                />

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <Button onClick={createImageForPage} variant="secondary" isLoading={isLoading} disabled={isLoading}>
                        <ArrowPathIcon />
                        Regenerate
                    </Button>
                    <Button onClick={handleApprove} variant="success" disabled={!imageUrl || isLoading}>
                        <CheckCircleIcon />
                        Looks Good!
                    </Button>
                </div>
            </div>
            <div className="w-full aspect-square rounded-2xl shadow-lg overflow-hidden">
                {isLoading && <div className="h-full"><Spinner message="Painting your picture..."/></div>}
                {!isLoading && error && (
                    <div className="w-full h-full bg-red-100 flex flex-col items-center justify-center p-4 text-center text-red-700 rounded-2xl dark:bg-red-900 dark:text-red-200">
                        <p className="font-semibold">Oh no!</p>
                        <p>{error}</p>
                    </div>
                )}
                {!isLoading && !error && imageUrl && (
                     <img src={imageUrl} alt={`Illustration for page ${page.page}`} className="w-full h-full object-cover animate-fade-in" />
                )}
                 {!isLoading && !error && !imageUrl && <ImagePlaceholder />}
            </div>
        </div>
    </Card>
  );
};

export default PageCreator;