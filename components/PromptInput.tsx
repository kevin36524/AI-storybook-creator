import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { MagicWandIcon, UsersIcon } from './icons/Icons';

interface PromptInputProps {
  onSubmit: (prompt: string, title: string) => void;
  onViewGallery: () => void;
  isLoading: boolean;
  error: string | null;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, onViewGallery, isLoading, error }) => {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && title.trim()) {
      onSubmit(prompt.trim(), title.trim());
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    // Suggest a title based on the prompt
    const suggestedTitle = suggestion.split(' who')[0];
    setTitle(suggestedTitle);
  };
  
  const suggestions = [
    "A brave little squirrel who is afraid of heights",
    "A magical unicorn that changes colors with its feelings",
    "A friendly robot who wants to learn how to bake cookies",
    "A mysterious submarine exploring the deep ocean"
  ];

  if (isLoading) {
    return <Card><Spinner message="Our story elves are brainstorming..." /></Card>;
  }

  return (
    <Card>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">What's your story about?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Tell us your idea, and we'll bring it to life!</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the title of your story?"
          className="w-full p-4 border-2 border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition duration-300 dark:bg-slate-800 dark:text-slate-200 dark:border-rose-700 dark:focus:ring-rose-600 dark:focus:border-rose-500"
          disabled={isLoading}
          required
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="For example: A curious cat who discovers a hidden garden..."
          className="w-full h-32 p-4 border-2 border-rose-200 rounded-2xl focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition duration-300 resize-none dark:bg-slate-800 dark:text-slate-200 dark:border-rose-700 dark:focus:ring-rose-600 dark:focus:border-rose-500"
          disabled={isLoading}
          required
        />
        {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
          <Button type="button" onClick={onViewGallery} variant="secondary" disabled={isLoading}>
            <UsersIcon />
            View Story Gallery
          </Button>
          <Button type="submit" disabled={!prompt.trim() || !title.trim() || isLoading} isLoading={isLoading}>
            <MagicWandIcon />
            Create My Story
          </Button>
        </div>
      </form>
      <div className="mt-8 text-center">
        <p className="text-slate-600 dark:text-slate-300 font-semibold mb-4">Or try one of our ideas:</p>
        <div className="flex flex-wrap gap-3 justify-center">
            {suggestions.map((s, i) => (
                <button 
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-4 py-2 bg-amber-200 text-amber-800 rounded-full hover:bg-amber-300 transition-colors text-sm dark:bg-amber-800 dark:text-amber-200 dark:hover:bg-amber-700"
                >
                    {s}
                </button>
            ))}
        </div>
      </div>
    </Card>
  );
};

export default PromptInput;