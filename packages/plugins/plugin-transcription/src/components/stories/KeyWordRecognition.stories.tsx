//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

type Word = {
  text: string;
  matched: boolean;
};

type StoryProps = {
  keywords: string[];
};

const DefaultStory = ({ keywords }: StoryProps) => {
  const [running, setRunning] = useState(false);
  const [matchingWords, setMatchingWords] = useState<Word[]>(keywords.map((word) => ({ text: word, matched: false })));

  const [transcript, setTranscript] = useState('');
  const recognition = useMemo(() => {
    // TODO(mykola): Fix types
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (!SpeechRecognition || !SpeechGrammarList) {
      log.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    // Add this line to enable punctuation
    recognition.grammars = new SpeechGrammarList();

    // TODO(mykola): Fix types
    recognition.onresult = (event: any) => {
      log.info('recognition result', { event });
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;

      // Remove punctuation and normalize whitespace for comparison
      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .replace(/[.,!?]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const normalizedTranscript = normalizeText(transcript);

      // Check each keyword and update matching words
      const updatedWords = matchingWords.map((word) => {
        const normalizedKeyword = normalizeText(word.text);
        const matched = normalizedTranscript.includes(normalizedKeyword);
        return { ...word, matched };
      });

      setMatchingWords(updatedWords);
      setTranscript(transcript);
    };

    // TODO(mykola): Fix types
    recognition.onerror = (event: any) => {
      log.error('Speech recognition error:', { error: event.error });
      setRunning(false);
    };

    return recognition;
  }, []);

  useEffect(() => {
    if (running) {
      recognition?.start();
    } else {
      recognition?.stop();
    }
  }, [running, recognition]);

  return (
    <div className={mx('flex flex-col gap-2 is-[30rem]')}>
      <Toolbar.Root>
        <Toolbar.IconButton
          iconOnly
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => setRunning((running) => !running)}
        />
      </Toolbar.Root>

      <div className='flex flex-wrap'>
        {matchingWords.map((word, index) => (
          <span
            key={index}
            className={mx(
              'pli-3 plb-1 m-2 rounded border',
              word.matched ? 'bg-red-200 text-red-800 border-red-300' : 'bg-gray-200 text-gray-600 border-gray-300',
            )}
          >
            {word.text}
          </span>
        ))}
      </div>

      <span>{transcript || (running ? 'Listening...' : 'Click play to start speech recognition')}</span>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/KeyWordDetection',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpeechRecognitionAPI: Story = {
  args: {
    keywords: ['kai', 'computer', 'hello'],
  },
};
