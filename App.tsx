
import React, { useState, useCallback } from 'react';
import { AppState } from './constants';
import type { StoryPage } from './types';
import { generateStoryOutline } from './services/geminiService';
import PromptInput from './components/PromptInput';
import OutlineDisplay from './components/OutlineDisplay';
import PageCreator from './components/PageCreator';
import StoryBookDisplay from './components/StoryBookDisplay';
import { BookOpenIcon, SparklesIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.PROMPT);
  const [storyPrompt, setStoryPrompt] = useState<string>('');
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = () => {
    setAppState(AppState.PROMPT);
    setStoryPrompt('');
    setStoryPages([]);
    setCurrentPageIndex(0);
    setError(null);
    setIsLoading(false);
  };

  const handlePromptSubmit = useCallback(async (prompt: string) => {
    setStoryPrompt(prompt);
    setIsLoading(true);
    setError(null);
    try {
      const outline = await generateStoryOutline(prompt);
      setStoryPages(outline);
      setAppState(AppState.OUTLINE);
    } catch (err) {
      setError('Oh no! Our story-writing magic fizzled. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOutlineConfirm = () => {
    setAppState(AppState.CREATING_PAGES);
  };

  const handlePageComplete = useCallback((pageIndex: number, imageUrl: string) => {
    setStoryPages(prevPages => {
      const newPages = [...prevPages];
      newPages[pageIndex] = { ...newPages[pageIndex], imageUrl };
      return newPages;
    });

    if (pageIndex < storyPages.length - 1) {
      setCurrentPageIndex(pageIndex + 1);
    } else {
      setAppState(AppState.FINISHED);
    }
  }, [storyPages.length]);

  const renderContent = () => {
    switch (appState) {
      case AppState.PROMPT:
        return (
          <PromptInput
            onSubmit={handlePromptSubmit}
            isLoading={isLoading}
            error={error}
          />
        );
      case AppState.OUTLINE:
        return (
          <OutlineDisplay
            pages={storyPages}
            onConfirm={handleOutlineConfirm}
            onRetry={handleReset}
          />
        );
      case AppState.CREATING_PAGES:
        return (
          <PageCreator
            page={storyPages[currentPageIndex]}
            pageIndex={currentPageIndex}
            totalPages={storyPages.length}
            onPageComplete={handlePageComplete}
          />
        );
      case AppState.FINISHED:
        return <StoryBookDisplay pages={storyPages} onReset={handleReset} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-rose-200 text-slate-800 antialiased">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="font-title text-5xl md:text-7xl text-rose-500 flex items-center justify-center gap-4">
            <BookOpenIcon />
            AI Storybook Creator
            <SparklesIcon />
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Let's create a magical story together!
          </p>
        </header>
        <div className="max-w-4xl mx-auto">
            {renderContent()}
        </div>
      </main>
      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>Powered by Gemini AI. Created with imagination.</p>
      </footer>
    </div>
  );
};

export default App;
