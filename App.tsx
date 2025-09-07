import React, { useState, useCallback } from 'react';
import { AppState } from './constants';
import type { StoryPage, Character } from './types';
import { generateStoryOutline, identifyCharactersAndPages } from './services/geminiService';
import PromptInput from './components/PromptInput';
import OutlineDisplay from './components/OutlineDisplay';
import CharacterCreator from './components/CharacterCreator';
import PageCreator from './components/PageCreator';
import StoryBookDisplay from './components/StoryBookDisplay';
import { BookOpenIcon, SparklesIcon } from './components/icons/Icons';
import Card from './components/ui/Card';
import Spinner from './components/ui/Spinner';


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.PROMPT);
  const [storyPrompt, setStoryPrompt] = useState<string>('');
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = () => {
    setAppState(AppState.PROMPT);
    setStoryPrompt('');
    setStoryPages([]);
    setCharacters([]);
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

  const handleOutlineConfirm = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { characters, pagesWithCharacters } = await identifyCharactersAndPages(storyPages);
      setCharacters(characters);
      
      const updatedPages = storyPages.map(p => {
        const pageUpdate = pagesWithCharacters.find(pwc => pwc.page === p.page);
        return pageUpdate ? { ...p, characters: pageUpdate.characters } : p;
      });
      setStoryPages(updatedPages);

      setAppState(AppState.CHARACTER_CREATION);
    } catch (err) {
      setError('We had trouble finding the characters in the story. Please try again.');
      console.error(err);
      setAppState(AppState.OUTLINE); // Go back to outline view on error
    } finally {
      setIsLoading(false);
    }
  }, [storyPages]);
  
  const handleCharactersConfirm = (finalCharacters: Character[]) => {
    setCharacters(finalCharacters);
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
    if (isLoading && appState !== AppState.PROMPT && appState !== AppState.CREATING_PAGES) {
      return <Card><Spinner message="Finding your characters..." /></Card>;
    }
    if (error && appState === AppState.OUTLINE) {
        return (
            <Card className="text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={handleReset} className="text-rose-500 font-semibold">Start Over</button>
            </Card>
        )
    }

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
      case AppState.CHARACTER_CREATION:
        return (
            <CharacterCreator 
                characters={characters}
                onComplete={handleCharactersConfirm}
            />
        );
      case AppState.CREATING_PAGES:
        return (
          <PageCreator
            page={storyPages[currentPageIndex]}
            allCharacters={characters}
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
