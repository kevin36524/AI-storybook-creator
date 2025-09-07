import React from 'react';
import type { StoryPage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { CheckCircleIcon, ArrowUturnLeftIcon, TrashIcon } from './icons/Icons';

interface OutlineDisplayProps {
  pages: StoryPage[];
  onConfirm: () => void;
  onRetry: () => void;
  onPageUpdate: (pageIndex: number, newText: string) => void;
  onPageDelete: (pageIndex: number) => void;
}

const OutlineDisplay: React.FC<OutlineDisplayProps> = ({ pages, onConfirm, onRetry, onPageUpdate, onPageDelete }) => {
  return (
    <Card className="animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-700 mb-2">Here's Your Story Plan!</h2>
        <p className="text-slate-500 mb-8">Feel free to edit the text or remove pages.</p>
      </div>
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4">
        {pages.map((page, index) => (
          <div key={page.page} className="bg-amber-50 p-4 rounded-xl border border-amber-200 dark:bg-slate-800 dark:border-amber-800 flex items-start gap-4">
            <div className="flex-grow">
                <h3 className="font-bold text-rose-500 dark:text-rose-400">Page {page.page}</h3>
                <textarea
                    value={page.text}
                    onChange={(e) => onPageUpdate(index, e.target.value)}
                    className="w-full mt-1 p-2 bg-transparent rounded-lg border border-amber-200 dark:border-amber-700 focus:ring-rose-400 focus:border-rose-400 text-slate-600 dark:text-slate-300 resize-y"
                    rows={3}
                />
            </div>
            <button
                onClick={() => onPageDelete(index)}
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                aria-label={`Remove page ${page.page}`}
            >
                <TrashIcon />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={onRetry} variant="secondary">
            <ArrowUturnLeftIcon />
            Start Over
        </Button>
        <Button onClick={onConfirm} variant="success" disabled={pages.length === 0}>
            <CheckCircleIcon />
            Yes, Let's Make It!
        </Button>
      </div>
    </Card>
  );
};

export default OutlineDisplay;