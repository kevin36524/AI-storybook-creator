
import React, { useState } from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowRightIcon, MagicWandIcon } from './icons/Icons';

interface StoryBookDisplayProps {
  pages: StoryPage[];
  onReset: () => void;
}

const StoryBookDisplay: React.FC<StoryBookDisplayProps> = ({ pages, onReset }) => {
  const [currentPage, setCurrentPage] = useState(0);

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

        {isLastPage && (
            <div className="mt-10 text-center border-t border-rose-200 pt-8">
                <h3 className="text-2xl font-bold text-slate-700">The End</h3>
                <p className="text-slate-500 my-4">Want to create another magical tale?</p>
                <Button onClick={onReset} variant="primary">
                    <MagicWandIcon />
                    Create a New Story
                </Button>
            </div>
        )}
    </Card>
  );
};

export default StoryBookDisplay;
