import React from 'react';
import type { PublicStory } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowUturnLeftIcon } from './icons/Icons';

interface GalleryProps {
  stories: PublicStory[];
  onBack: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ stories, onBack }) => {
  return (
    <Card className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200">Community Story Gallery</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">See what magical stories others have created!</p>
      </div>

      {stories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto p-2">
          {stories.map((story) => (
            <a
              key={story.id}
              href={story.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={story.coverImageUrl}
                  alt={`Cover for ${story.title}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate group-hover:text-rose-500 transition-colors">
                  {story.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">by {story.author}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-amber-50 rounded-xl dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-300">The gallery is empty right now. Be the first to share a story!</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button onClick={onBack} variant="secondary">
          <ArrowUturnLeftIcon />
          Back to Creator
        </Button>
      </div>
    </Card>
  );
};

export default Gallery;
