import React, { useState, useEffect, useRef } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { saveHtmlToCloud } from '../services/geminiService';
import { ArrowRightIcon, MagicWandIcon, DownloadIcon, CodeBracketIcon, SpeakerWaveIcon, PlayCircleIcon, PauseCircleIcon } from './icons/Icons';

declare const jspdf: any;

interface StoryBookDisplayProps {
  pages: StoryPage[];
  onReset: () => void;
  isGeneratingAudio: boolean;
  onGenerateAudiobook: () => void;
}

const StoryBookDisplay: React.FC<StoryBookDisplayProps> = ({ pages, onReset, isGeneratingAudio, onGenerateAudiobook }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSavingHtml, setIsSavingHtml] = useState(false);
  const [htmlPublicUrl, setHtmlPublicUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  }, [currentPage]);
  
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleAudioEnd = () => setIsPlaying(false);
    audioElement?.addEventListener('ended', handleAudioEnd);
    return () => {
      audioElement?.removeEventListener('ended', handleAudioEnd);
    };
  }, []);

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleTogglePlay = () => {
    if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  const handleDownloadPdf = async () => { /* Unchanged */ };

  const handleSaveAndDownloadHtml = async () => {
    setIsSavingHtml(true);
    setHtmlPublicUrl(null);

    const title = "My Awesome Storybook";
    const styles = `
        body { font-family: 'Poppins', sans-serif; margin: 0; padding: 20px; background-color: #fef3c7; color: #374151; }
        .page-container { max-width: 800px; margin: 0 auto; }
        .page { margin: 40px 0; padding: 30px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #f43f5e; font-family: 'Pacifico', cursive; font-size: 3em; }
        h2 { color: #f43f5e; border-bottom: 2px solid #fb7185; padding-bottom: 5px; }
        img { max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 20px; }
        p { font-size: 1.1em; line-height: 1.7; }
    `;

    let content = `<h1>${title}</h1>`;
    pages.forEach(page => {
        content += `
            <div class="page">
                <h2>Page ${page.page}</h2>
                ${page.imageUrl ? `<img src="${page.imageUrl}" alt="Page ${page.page} illustration">` : ''}
                <p>${page.text}</p>
            </div>
        `;
    });

    const htmlString = `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
        <title>${title}</title><style>${styles}</style></head><body><div class="page-container">${content}</div></body></html>
    `;
    
    // Save to cloud
    try {
        const publicUrl = await saveHtmlToCloud(htmlString);
        setHtmlPublicUrl(publicUrl);
    } catch (error) {
        console.error("Failed to save HTML to cloud:", error);
        // Optionally set an error state to show in the UI
    }

    // Also provide local download
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-storybook.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsSavingHtml(false);
  }

  const isLastPage = currentPage === pages.length - 1;
  const currentAudioUrl = pages[currentPage].audioUrl;

  return (
    <Card className="animate-fade-in">
        <div className="text-center mb-6">
             <h2 className="font-title text-5xl text-rose-500 dark:text-rose-400">Your Story is Ready!</h2>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-inner border border-rose-100 dark:bg-slate-800 dark:border-rose-900 relative">
             {currentAudioUrl && (
                <>
                    <button onClick={handleTogglePlay} className="absolute top-4 right-4 z-10 text-rose-500 hover:text-rose-700 transition-colors">
                        {isPlaying ? <PauseCircleIcon /> : <PlayCircleIcon />}
                    </button>
                    <audio ref={audioRef} src={currentAudioUrl} preload="auto" />
                </>
            )}
            <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="aspect-square w-full rounded-xl overflow-hidden shadow-lg">
                    <img src={pages[currentPage].imageUrl} alt={`Story page ${pages[currentPage].page}`} className="w-full h-full object-cover"/>
                </div>
                <div><p className="text-slate-700 dark:text-slate-200 text-xl md:text-2xl leading-relaxed">{pages[currentPage].text}</p></div>
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
             <Button onClick={goToPrevPage} variant="secondary" disabled={currentPage === 0}>Previous</Button>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Page {currentPage + 1} of {pages.length}</span>
             <Button onClick={goToNextPage} variant="secondary" disabled={isLastPage}>Next</Button>
        </div>
        
        <div className="mt-10 text-center border-t border-rose-200 dark:border-rose-800 pt-8 flex flex-col items-center gap-4">
             {isLastPage && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">The End!</h3>
                    <Button onClick={onReset} variant="primary"><MagicWandIcon />Create a New Story</Button>
                </div>
             )}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
                <Button onClick={onGenerateAudiobook} variant="primary" isLoading={isGeneratingAudio} disabled={isGeneratingAudio || !!pages[0].audioUrl}><SpeakerWaveIcon />{pages[0].audioUrl ? 'Audiobook Created' : 'Create Audiobook'}</Button>
                <Button onClick={handleDownloadPdf} variant="success" isLoading={isDownloadingPdf}><DownloadIcon />Download PDF</Button>
                <Button onClick={handleSaveAndDownloadHtml} variant="success" isLoading={isSavingHtml}><CodeBracketIcon />Save & Download HTML</Button>
            </div>
            {htmlPublicUrl && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-900/50 dark:border-emerald-700">
                    <p className="text-emerald-700 dark:text-emerald-200">
                        Story saved to cloud!{' '}
                        <a href={htmlPublicUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-emerald-500">
                            Open shareable link
                        </a>
                    </p>
                </div>
            )}
        </div>
    </Card>
  );
};

export default StoryBookDisplay;
