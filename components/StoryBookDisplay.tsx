import React, { useState, useEffect, useRef } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { saveHtmlToCloud, shareStory } from '../services/geminiService';
import { ArrowRightIcon, MagicWandIcon, DownloadIcon, CodeBracketIcon, SpeakerWaveIcon, PlayCircleIcon, PauseCircleIcon } from './icons/Icons';

declare const jspdf: any;

interface StoryBookDisplayProps {
  pages: StoryPage[];
  title: string;
  onReset: () => void;
  isGeneratingAudio: boolean;
  onGenerateAudiobook: () => void;
}

const StoryBookDisplay: React.FC<StoryBookDisplayProps> = ({ pages, title, onReset, isGeneratingAudio, onGenerateAudiobook }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSavingHtml, setIsSavingHtml] = useState(false);
  const [htmlPublicUrl, setHtmlPublicUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [shareConsent, setShareConsent] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');


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
    if (currentPage > 0) setCurrentPage(currentPage + 1);
  };

  const handleTogglePlay = () => {
    if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  const generateHtmlString = () => {
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

    return `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
        <title>${title}</title><style>${styles}</style></head><body><div class="page-container">${content}</div></body></html>
    `;
  };

  const handleDownloadPdf = async () => { /* Unchanged */ };

  const handleSaveAndDownloadHtml = async () => {
    setIsSavingHtml(true);
    if (!htmlPublicUrl) { // Only upload if not already uploaded
        try {
            const htmlString = generateHtmlString();
            const publicUrl = await saveHtmlToCloud(htmlString);
            setHtmlPublicUrl(publicUrl);
            downloadLocalHtml(htmlString);
        } catch (error) {
            console.error("Failed to save HTML to cloud:", error);
        }
    } else { // If already uploaded, just download locally
        downloadLocalHtml(generateHtmlString());
    }
    setIsSavingHtml(false);
  }
  
  const downloadLocalHtml = (htmlString: string) => {
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleShare = async () => {
    if (!htmlPublicUrl) {
      alert("Please save the story first before sharing.");
      return;
    }
    setShareStatus('loading');
    try {
        await shareStory({
            title,
            author: authorName,
            coverImageUrl: pages[0].imageUrl || '',
            htmlUrl: htmlPublicUrl
        });
        setShareStatus('success');
    } catch(err) {
        setShareStatus('error');
    }
  };

  const isLastPage = currentPage === pages.length - 1;
  const currentAudioUrl = pages[currentPage].audioUrl;

  return (
    <Card className="animate-fade-in">
        <div className="text-center mb-6">
             <h2 className="font-title text-5xl text-rose-500 dark:text-rose-400">{title}</h2>
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
        
        <div className="mt-10 border-t border-rose-200 dark:border-rose-800 pt-8 flex flex-col items-center gap-6">
            <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={onGenerateAudiobook} variant="primary" isLoading={isGeneratingAudio} disabled={isGeneratingAudio || !!pages[0].audioUrl}><SpeakerWaveIcon />{pages[0].audioUrl ? 'Audiobook Created' : 'Create Audiobook'}</Button>
                <Button onClick={handleDownloadPdf} variant="secondary" isLoading={isDownloadingPdf}><DownloadIcon />Download PDF</Button>
                <Button onClick={handleSaveAndDownloadHtml} variant="secondary" isLoading={isSavingHtml}><CodeBracketIcon />{htmlPublicUrl ? 'Download HTML' : 'Save & Download HTML'}</Button>
            </div>
            {htmlPublicUrl && (
                <div className="w-full max-w-lg p-6 bg-amber-50 border border-amber-200 rounded-2xl dark:bg-slate-800/50 dark:border-amber-700 text-center space-y-4">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Share Your Story!</h3>
                    {shareStatus === 'success' ? (
                        <div className="p-4 bg-emerald-100 text-emerald-800 rounded-lg dark:bg-emerald-900 dark:text-emerald-200">Story successfully shared to the gallery!</div>
                    ) : (
                    <>
                        <div className="flex items-center justify-center gap-2">
                            <input type="checkbox" id="share-consent" checked={shareConsent} onChange={(e) => setShareConsent(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="share-consent" className="text-slate-600 dark:text-slate-300">I want to share this story publicly.</label>
                        </div>
                        {shareConsent && (
                            <div className="space-y-3 animate-fade-in">
                                <input 
                                    type="text"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder="Your Name (Author)"
                                    className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-300 dark:bg-slate-700 dark:border-rose-800"
                                />
                                <Button onClick={handleShare} isLoading={shareStatus === 'loading'} disabled={!authorName.trim() || shareStatus !== 'idle'}>Share to Gallery</Button>
                                {shareStatus === 'error' && <p className="text-red-500 text-sm">Could not share story. Please try again.</p>}
                            </div>
                        )}
                    </>
                    )}
                </div>
            )}
             <Button onClick={onReset} variant="primary" className="mt-4"><MagicWandIcon />Create a New Story</Button>
        </div>
    </Card>
  );
};

export default StoryBookDisplay;