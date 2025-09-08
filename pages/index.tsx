import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import { AppState } from '../constants';
import type { StoryPage, Character, PublicStory } from '../types';
import { generateStoryOutline, identifyCharactersAndPages, generateAudioForText, getPublicStories } from '../services/geminiService';
import PromptInput from '../components/PromptInput';
import OutlineDisplay from '../components/OutlineDisplay';
import CharacterCreator from '../components/CharacterCreator';
import PageCreator from '../components/PageCreator';
import StoryBookDisplay from '../components/StoryBookDisplay';
import Gallery from '../components/Gallery';
import { BookOpenIcon, SparklesIcon } from '../components/icons/Icons';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';


const HomePage: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.PROMPT);
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [storyPrompt, setStoryPrompt] = useState<string>('');
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [publicStories, setPublicStories] = useState<PublicStory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);

  const handleReset = () => {
    setAppState(AppState.PROMPT);
    setStoryTitle('');
    setStoryPrompt('');
    setStoryPages([]);
    setCharacters([]);
    setCurrentPageIndex(0);
    setError(null);
    setIsLoading(false);
    setIsGeneratingAudio(false);
  };

  const handlePromptSubmit = useCallback(async (prompt: string, title: string) => {
    setStoryPrompt(prompt);
    setStoryTitle(title);
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

  const handlePageUpdate = useCallback((pageIndex: number, newText: string) => {
    setStoryPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, text: newText } : p));
  }, []);

  const handlePageDelete = useCallback((pageIndex: number) => {
    setStoryPages(prev => {
        const newPages = prev.filter((_, i) => i !== pageIndex);
        // Re-number pages
        return newPages.map((p, i) => ({ ...p, page: i + 1 }));
    });
  }, []);

  const handleViewGallery = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const stories = await getPublicStories();
        setPublicStories(stories);
        setAppState(AppState.GALLERY);
    } catch(err) {
        setError('Could not load the story gallery. Please try again later.');
        console.error(err);
        setAppState(AppState.PROMPT); // Go back to prompt on error
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

  const handlePageTextChange = useCallback((pageIndex: number, newText: string) => {
    setStoryPages(prevPages => 
      prevPages.map((page, index) => 
        index === pageIndex ? { ...page, text: newText } : page
      )
    );
  }, []);

  const handleGenerateAudiobook = useCallback(async () => {
    setIsGeneratingAudio(true);
    try {
      const pagesWithAudio = await Promise.all(storyPages.map(async (page) => {
        if (!page.audioUrl) {
          const audioUrl = await generateAudioForText(page.text);
          return { ...page, audioUrl };
        }
        return page;
      }));
      setStoryPages(pagesWithAudio);
    } catch (err) {
      console.error("Failed to generate audiobook", err);
      // Optionally set an error state to show in the UI
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [storyPages]);

  const renderContent = () => {
    if (isLoading && appState !== AppState.PROMPT && appState !== AppState.CREATING_PAGES) {
      return <Card><Spinner message="Loading..." /></Card>;
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
            onViewGallery={handleViewGallery}
            isLoading={isLoading}
            error={error}
          />
        );
      case AppState.GALLERY:
        return (
            <Gallery stories={publicStories} onBack={handleReset} />
        );
      case AppState.OUTLINE:
        return (
          <OutlineDisplay
            pages={storyPages}
            onConfirm={handleOutlineConfirm}
            onPageUpdate={handlePageUpdate}
            onPageDelete={handlePageDelete}
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
            onPageTextChange={handlePageTextChange}
          />
        );
      case AppState.FINISHED:
        return (
          <StoryBookDisplay 
            pages={storyPages}
            title={storyTitle}
            onReset={handleReset}
            isGeneratingAudio={isGeneratingAudio}
            onGenerateAudiobook={handleGenerateAudiobook}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>AI Storybook Creator</title>
        <meta name="description" content="An application for kids to create their own storybooks using AI." />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" async></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" async></script>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-rose-200 text-slate-800 antialiased dark:bg-slate-900 dark:from-slate-800 dark:to-rose-900 dark:text-slate-200">
        <main className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="font-title text-5xl md:text-7xl text-rose-500 dark:text-rose-400 flex items-center justify-center gap-4">
              <BookOpenIcon />
              AI Storybook Creator
              <SparklesIcon />
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-4 text-lg">
              Let's create a magical story together!
            </p>
          </header>
          <div className="max-w-4xl mx-auto">
              {renderContent()}
          </div>
        </main>
        <footer className="text-center p-4 text-slate-500 dark:text-slate-400 text-sm">
          <p>Powered by Gemini AI. Created with imagination.</p>
        </footer>
      </div>
    </>
  );
};

export default HomePage;
