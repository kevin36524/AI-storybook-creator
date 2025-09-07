import React, { useState } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowRightIcon, MagicWandIcon, DownloadIcon } from './icons/Icons';

// This tells TypeScript that jspdf is available on the window object
declare const jspdf: any;

interface StoryBookDisplayProps {
  pages: StoryPage[];
  onReset: () => void;
}

const StoryBookDisplay: React.FC<StoryBookDisplayProps> = ({ pages, onReset }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownload = async () => {
    setIsDownloading(true);
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
    setIsDownloading(false);
  };


  const isLastPage = currentPage === pages.length - 1;

  return (
    <Card className="animate-fade-in">
        <div className="text-center mb-6">
             <h2 className="font-title text-5xl text-rose-500">Your Story is Ready!</h2>
             <p className="text-slate-600 mt-2 text-lg">Turn the page to read your adventure.</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-inner border border-rose-100">
            <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="aspect-square w-full rounded-xl overflow-hidden shadow-lg">
                    <img 
                        src={pages[currentPage].imageUrl} 
                        alt={`Story page ${pages[currentPage].page}`} 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col justify-center min-h-[200px] sm:min-h-full">
                    <p className="text-slate-700 text-xl md:text-2xl leading-relaxed">
                        {pages[currentPage].text}
                    </p>
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
             <Button onClick={goToPrevPage} variant="secondary" disabled={currentPage === 0}>
                Previous
             </Button>
            <span className="font-semibold text-slate-600">Page {currentPage + 1} of {pages.length}</span>
             <Button onClick={goToNextPage} variant="secondary" disabled={isLastPage}>
                Next
             </Button>
        </div>
        
        <div className="mt-10 text-center border-t border-rose-200 pt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
             {isLastPage ? (
                <>
                    <h3 className="text-2xl font-bold text-slate-700">The End!</h3>
                    <Button onClick={onReset} variant="primary">
                        <MagicWandIcon />
                        Create a New Story
                    </Button>
                </>
             ) : (
                <p className="text-slate-500">Keep reading to see what happens next!</p>
             )}
             <Button onClick={handleDownload} variant="success" isLoading={isDownloading}>
                <DownloadIcon />
                Download PDF
            </Button>
        </div>
    </Card>
  );
};

export default StoryBookDisplay;
