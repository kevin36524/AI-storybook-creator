
import React, { useState, useEffect, useCallback } from 'react';
import { generateImage, generateImagePrompt } from '../services/geminiService';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { ArrowPathIcon, PaintBrushIcon, CheckCircleIcon } from './icons/Icons';

interface PageCreatorProps {
  page: StoryPage;
  pageIndex: number;
  totalPages: number;
  onPageComplete: (pageIndex: number, imageUrl: string) => void;
}

const ImagePlaceholder: React.FC = () => (
    <div className="w-full aspect-square bg-rose-100 rounded-2xl flex items-center justify-center">
        <PaintBrushIcon />
    </div>
);


const PageCreator: React.FC<PageCreatorProps> = ({ page, pageIndex, totalPages, onPageComplete }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const createImageForPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const imagePrompt = await generateImagePrompt(page.text);
      const generatedImageUrl = await generateImage(imagePrompt);
      setImageUrl(generatedImageUrl);
    } catch (err) {
      console.error(err);
      setError("The magic paintbrush slipped! Let's try drawing that again.");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.text, pageIndex]);

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
            <h2 className="text-3xl font-bold text-slate-700">Creating Page {pageIndex + 1} of {totalPages}</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}></div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <h3 className="font-bold text-rose-500 text-xl">Story Text</h3>
                <p className="text-slate-600 text-lg bg-amber-50 p-4 rounded-xl border border-amber-200 min-h-[100px]">{page.text}</p>
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <Button onClick={createImageForPage} variant="secondary" isLoading={isLoading} disabled={isLoading}>
                        <ArrowPathIcon />
                        Try Again
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
                    <div className="w-full h-full bg-red-100 flex flex-col items-center justify-center p-4 text-center text-red-700 rounded-2xl">
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
