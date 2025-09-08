import React, { useState, useEffect, useRef } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { shareStory } from '../services/geminiService';
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
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sharing state
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
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleTogglePlay = () => {
    if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  const generateHtmlStringWithAudio = () => {
    const styles = `
        * { box-sizing: border-box; }
        body { 
            font-family: 'Poppins', sans-serif; 
            margin: 0; 
            padding: 0;
            background: linear-gradient(135deg, #fef3c7 0%, #fecaca 100%);
            color: #1e293b;
            min-height: 100vh;
        }
        .storybook-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 1rem;
        }
        .title-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .main-title {
            font-family: 'Pacifico', cursive;
            font-size: clamp(2rem, 5vw, 3.5rem);
            color: #f43f5e;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .story-card {
            background: white;
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            max-width: 56rem;
            width: 100%;
            margin-bottom: 2rem;
            position: relative;
            border: 1px solid rgba(251, 113, 133, 0.1);
        }
        .page-content {
            background: white;
            border-radius: 1rem;
            padding: 1.5rem 2rem;
            box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);
            border: 1px solid rgba(251, 113, 133, 0.1);
            position: relative;
        }
        .page-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: center;
        }
        @media (max-width: 768px) {
            .page-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
        }
        .image-container {
            aspect-ratio: 1;
            width: 100%;
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }
        .page-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .page-text {
            color: #475569;
            font-size: clamp(1.125rem, 2vw, 1.5rem);
            line-height: 1.6;
            margin: 0;
        }
        .audio-button {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: #f43f5e;
            color: white;
            border: none;
            border-radius: 50%;
            width: 3rem;
            height: 3rem;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.2s ease;
            z-index: 10;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .audio-button:hover {
            background: #e11d48;
            transform: scale(1.05);
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
        }
        .nav-button {
            background: #f1f5f9;
            color: #64748b;
            border: none;
            border-radius: 0.5rem;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .nav-button:hover:not(:disabled) {
            background: #e2e8f0;
            color: #475569;
        }
        .nav-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .page-counter {
            font-weight: 600;
            color: #64748b;
            font-size: 1rem;
        }
        .page { display: none; }
        .page.active { display: block; }
        .hidden { display: none !important; }
    `;

    let pagesHtml = '';
    pages.forEach((page, index) => {
        const audioFileName = page.audioUrl ? `audio_page_${page.page}.mp3` : null;
        pagesHtml += `
            <div class="page ${index === 0 ? 'active' : ''}" id="page-${index}">
                <div class="page-content">
                    ${audioFileName ? `
                        <button class="audio-button" onclick="toggleAudio('audio-${index}', this)" title="Play/Pause Audio">
                            <span id="button-text-${index}">▶</span>
                        </button>
                        <audio id="audio-${index}" preload="auto" onended="resetButton('button-text-${index}')">
                            <source src="${audioFileName}" type="audio/mpeg">
                        </audio>
                    ` : ''}
                    <div class="page-grid">
                        <div class="image-container">
                            <img src="${page.imageUrl || ''}" alt="Page ${page.page} illustration" class="page-image">
                        </div>
                        <div>
                            <p class="page-text">${page.text}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    const script = `
        <script>
        let currentPage = 0;
        const totalPages = ${pages.length};

        function showPage(pageIndex) {
            document.querySelectorAll('.page').forEach((page, index) => {
                page.classList.toggle('active', index === pageIndex);
            });
            
            // Update navigation buttons
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const counter = document.getElementById('page-counter');
            
            prevBtn.disabled = pageIndex === 0;
            nextBtn.disabled = pageIndex === totalPages - 1;
            counter.textContent = \`Page \${pageIndex + 1} of \${totalPages}\`;
            
            // Stop any playing audio when changing pages
            document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            document.querySelectorAll('[id^="button-text-"]').forEach(btn => {
                btn.textContent = '▶';
            });
        }

        function goToPage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 0 && newPage < totalPages) {
                currentPage = newPage;
                showPage(currentPage);
            }
        }

        function toggleAudio(audioId, button) {
            const audio = document.getElementById(audioId);
            const buttonText = button.querySelector('span');
            
            // Stop all other audios
            document.querySelectorAll('audio').forEach(a => {
                if (a.id !== audioId) {
                    a.pause();
                    a.currentTime = 0;
                }
            });
            document.querySelectorAll('[id^="button-text-"]').forEach(btn => {
                if (btn !== buttonText) btn.textContent = '▶';
            });
            
            if (audio.paused) {
                audio.play();
                buttonText.textContent = '⏸';
            } else {
                audio.pause();
                buttonText.textContent = '▶';
            }
        }

        function resetButton(buttonId) {
            document.getElementById(buttonId).textContent = '▶';
        }

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') goToPage(-1);
            if (e.key === 'ArrowRight') goToPage(1);
            if (e.key === ' ') {
                e.preventDefault();
                const audioButton = document.querySelector('.page.active .audio-button');
                if (audioButton) audioButton.click();
            }
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            showPage(0);
        });
        </script>
    `;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
            <title>${title}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="storybook-container">
                <div class="title-header">
                    <h1 class="main-title">${title}</h1>
                </div>
                
                <div class="story-card">
                    ${pagesHtml}
                    
                    <div class="navigation">
                        <button id="prev-btn" class="nav-button" onclick="goToPage(-1)">Previous</button>
                        <span id="page-counter" class="page-counter">Page 1 of ${pages.length}</span>
                        <button id="next-btn" class="nav-button" onclick="goToPage(1)">Next</button>
                    </div>
                </div>
            </div>
            ${script}
        </body>
        </html>
    `;
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (i > 0) doc.addPage();
            
            let cursorY = margin;

            if (page.imageUrl) {
                const img = new Image();
                img.src = page.imageUrl;
                await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
                
                if (img.width > 0) {
                    const imgHeight = (img.height * contentWidth) / img.width;
                    doc.addImage(page.imageUrl, 'PNG', margin, cursorY, contentWidth, imgHeight);
                    cursorY += imgHeight + 20;
                }
            }
            
            const splitText = doc.splitTextToSize(page.text, contentWidth);
            doc.text(splitText, margin, cursorY);
        }
        
        doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  const handleDownloadHtmlWithAudio = async () => {
    setIsDownloadingHtml(true);
    try {
        const htmlString = generateHtmlStringWithAudio();
        
        // If there are audio files, create a zip
        const hasAudio = pages.some(page => page.audioUrl);
        
        if (hasAudio) {
            await downloadHtmlWithAudioAsZip(htmlString);
        } else {
            downloadLocalHtml(htmlString);
        }
    } catch (error) {
        console.error("Failed to download HTML with audio:", error);
    }
    setIsDownloadingHtml(false);
  };
  
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

  const downloadHtmlWithAudioAsZip = async (htmlString: string) => {
    // Create a simple zip-like structure using JSZip if available, or fallback to individual downloads
    const JSZip = (window as any).JSZip;
    
    if (JSZip) {
      const zip = new JSZip();
      zip.file(`${title.toLowerCase().replace(/\s+/g, '-')}.html`, htmlString);
      
      // Add audio files
      for (const page of pages) {
        if (page.audioUrl) {
          try {
            const response = await fetch(page.audioUrl);
            const audioBlob = await response.blob();
            zip.file(`audio_page_${page.page}.mp3`, audioBlob);
          } catch (error) {
            console.error(`Failed to download audio for page ${page.page}:`, error);
          }
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-audiobook.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback: download HTML and prompt user about audio
      downloadLocalHtml(htmlString);
      alert('Note: Audio files are available for playback but cannot be packaged for download. The HTML file includes audio player controls.');
    }
  };
  
  const handleShare = async () => {
    alert("Sharing functionality has been temporarily disabled. Please download your story locally.");
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
                <Button onClick={handleDownloadHtmlWithAudio} variant="secondary" isLoading={isDownloadingHtml}><CodeBracketIcon />Download HTML{pages.some(page => page.audioUrl) ? ' with Audio' : ''}</Button>
            </div>
            {false && (
                <div className="w-full max-w-lg p-6 bg-amber-50 border border-amber-200 rounded-2xl dark:bg-slate-800/50 dark:border-amber-700 text-center space-y-4">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Share Your Story!</h3>
                    <p className="text-slate-600 dark:text-slate-300">Sharing functionality is temporarily disabled. Please download your story to share it manually.</p>
                </div>
            )}
             <Button onClick={onReset} variant="primary" className="mt-4"><MagicWandIcon />Create a New Story</Button>
        </div>
    </Card>
  );
};

export default StoryBookDisplay;