//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type Word } from '#types';

export type FlashcardProps = ThemedClassName<{
  word: Word.Word;
  /** The answer side is showing. */
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (correct: boolean) => void;
}>;

/**
 * One drill card: the term, then the translation once revealed, then a self-graded verdict.
 * Self-grading rather than typed input — recall, not spelling, is what the schedule measures.
 */
export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }: FlashcardProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <div className={mx('flex flex-col items-center justify-center gap-6 p-8', classNames)}>
      <div className='flex flex-col items-center gap-2 text-center'>
        <span className='text-3xl'>{word.term}</span>
        {word.reading && <span className='text-description'>{word.reading}</span>}
      </div>

      {revealed ? (
        <div className='flex flex-col items-center gap-2 text-center'>
          <span className='text-2xl text-accent-text'>{word.translation}</span>
          {word.partOfSpeech && <span className='text-sm text-description'>{word.partOfSpeech}</span>}
          {word.examples?.[0] && <span className='text-sm text-description italic'>{word.examples[0]}</span>}
        </div>
      ) : (
        <Next.Button onClick={onReveal} data-testid='lingo.flashcard.reveal'>
          <Next.Icon icon='ph--eye--regular' size='md' />
          <span className='pl-2'>{t('reveal.button')}</span>
        </Next.Button>
      )}

      {revealed && (
        <div className='flex gap-2'>
          <Next.Button onClick={() => onAnswer(false)} data-testid='lingo.flashcard.incorrect'>
            <Next.Icon icon='ph--x--regular' size='md' />
            <span className='pl-2'>{t('incorrect.button')}</span>
          </Next.Button>
          <Next.Button variant='primary' onClick={() => onAnswer(true)} data-testid='lingo.flashcard.correct'>
            <Next.Icon icon='ph--check--regular' size='md' />
            <span className='pl-2'>{t('correct.button')}</span>
          </Next.Button>
        </div>
      )}
    </div>
  );
};

Flashcard.displayName = 'Flashcard';
