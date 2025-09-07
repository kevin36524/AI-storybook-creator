import React, { useState, useEffect, useRef } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowRightIcon, MagicWandIcon, DownloadIcon, CodeBracketIcon, SpeakerWaveIcon, PlayCircleIcon, PauseCircleIcon } from './icons/Icons';

// This tells TypeScript that jspdf is available on the window object
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
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Stop audio when page changes
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  }, [currentPage]);
  
  useEffect(() => {
    // Handle audio ending
    const audioElement = audioRef.current;
    const handleAudioEnd = () => setIsPlaying(false);
    audioElement?.addEventListener('ended', handleAudioEnd);
    return () => {
      audioElement?.removeEventListener('ended', handleAudioEnd);
    };
  }, []);

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleTogglePlay = () => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
            doc.addPage();
        }

        // Add Image
        if (page.imageUrl) {
            try {
                const img = new Image();
                img.src = page.imageUrl;
                await new Promise(resolve => img.onload = resolve);
                const imgWidth = contentWidth;
                const imgHeight = (img.height * imgWidth) / img.width;
                doc.addImage(img, 'PNG', margin, margin, imgWidth, imgHeight);

                // Add Text
                const textY = margin + imgHeight + 30;
                doc.setFontSize(14);
                doc.setTextColor(51, 65, 85); // slate-700
                const textLines = doc.splitTextToSize(page.text, contentWidth);
                doc.text(textLines, margin, textY);
            } catch (error) {
                console.error("Error adding image to PDF:", error);
                doc.text("Error loading image.", margin, margin);
            }
        } else {
             doc.text("No image for this page.", margin, margin);
        }
    }

    doc.save('my-storybook.pdf');
    setIsDownloadingPdf(false);
  };

  const handleDownloadHtml = () => {
    setIsDownloadingHtml(true);
    const title = "My Awesome Storybook";
    const styles = `
        body { font-family: sans-serif; margin: 0; padding: 40px; background-color: #fdf6e3; color: #333; }
        .page { max-width: 800px; margin: 40px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #d6336c; }
        h2 { color: #d6336c; border-bottom: 2px solid #f06595; padding-bottom: 5px; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; }
        p { font-size: 1.2em; line-height: 1.6; }
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
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>${styles}</style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;

    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-storybook.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsDownloadingHtml(false);
  }

  const isLastPage = currentPage === pages.length - 1;
  const currentAudioUrl = pages[currentPage].audioUrl;

  return (
    <Card className="animate-fade-in">
        <div className="text-center mb-6">
             <h2 className="font-title text-5xl text-rose-500 dark:text-rose-400">Your Story is Ready!</h2>
             <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Turn the page to read your adventure.</p>
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
                    <img 
                        src={pages[currentPage].imageUrl} 
                        alt={`Story page ${pages[currentPage].page}`} 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col justify-center min-h-[200px] sm:min-h-full">
                    <p className="text-slate-700 dark:text-slate-200 text-xl md:text-2xl leading-relaxed">
                        {pages[currentPage].text}
                    </p>
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
             <Button onClick={goToPrevPage} variant="secondary" disabled={currentPage === 0}>
                Previous
             </Button>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Page {currentPage + 1} of {pages.length}</span>
             <Button onClick={goToNextPage} variant="secondary" disabled={isLastPage}>
                Next
             </Button>
        </div>
        
        <div className="mt-10 text-center border-t border-rose-200 dark:border-rose-800 pt-8 flex flex-col items-center gap-4">
             {isLastPage ? (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">The End!</h3>
                    <Button onClick={onReset} variant="primary">
                        <MagicWandIcon />
                        Create a New Story
                    </Button>
                </div>
             ) : (
                <p className="text-slate-500 dark:text-slate-400">Keep reading to see what happens next!</p>
             )}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
                <Button 
                    onClick={onGenerateAudiobook} 
                    variant="primary" 
                    isLoading={isGeneratingAudio}
                    disabled={isGeneratingAudio || !!pages[0].audioUrl}
                >
                    <SpeakerWaveIcon />
                    {pages[0].audioUrl ? 'Audiobook Created' : 'Create Audiobook'}
                </Button>
                <Button onClick={handleDownloadPdf} variant="success" isLoading={isDownloadingPdf}>
                    <DownloadIcon />
                    Download PDF
                </Button>
                <Button onClick={handleDownloadHtml} variant="success" isLoading={isDownloadingHtml}>
                    <CodeBracketIcon />
                    Download HTML
                </Button>
            </div>
        </div>
    </Card>
  );
};

export default StoryBookDisplay;