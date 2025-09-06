
import React from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { CheckCircleIcon, ArrowUturnLeftIcon } from './icons/Icons';

interface OutlineDisplayProps {
  pages: StoryPage[];
  onConfirm: () => void;
  onRetry: () => void;
}

const OutlineDisplay: React.FC<OutlineDisplayProps> = ({ pages, onConfirm, onRetry }) => {
  return (
    <Card className="animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-700 mb-2">Here's Your Story Plan!</h2>
        <p className="text-slate-500 mb-8">Does this look like the beginning of a grand adventure?</p>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
        {pages.map((page) => (
          <div key={page.page} className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <h3 className="font-bold text-rose-500">Page {page.page}</h3>
            <p className="text-slate-600 mt-1">{page.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={onRetry} variant="secondary">
            <ArrowUturnLeftIcon />
            Start Over
        </Button>
        <Button onClick={onConfirm} variant="success">
            <CheckCircleIcon />
            Yes, Let's Make It!
        </Button>
      </div>
    </Card>
  );
};

export default OutlineDisplay;
