//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';
import { type Word } from '#types';

export type FlashcardProps = Util.ThemedClassName<{
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
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Layout.Flex column center gap='xl' classNames={['p-8', classNames]}>
      <Layout.Flex column align='center' gap='sm' classNames='text-center'>
        <span className='text-3xl'>{word.term}</span>
        {word.reading && <span className='text-fg-muted'>{word.reading}</span>}
      </Layout.Flex>

      {revealed ? (
        <Layout.Flex column align='center' gap='sm' classNames='text-center'>
          <span className='text-2xl text-accent-text'>{word.translation}</span>
          {word.partOfSpeech && <span className='text-sm text-fg-muted'>{word.partOfSpeech}</span>}
          {word.examples?.[0] && <span className='text-sm text-fg-muted italic'>{word.examples[0]}</span>}
        </Layout.Flex>
      ) : (
        <Button.Root onClick={onReveal} data-testid='lingo.flashcard.reveal'>
          <Icon.Icon icon='ph--eye--regular' size='md' />
          <span className='pl-2'>{t('reveal.button')}</span>
        </Button.Root>
      )}

      {revealed && (
        <Layout.Flex gap='sm'>
          <Button.Root onClick={() => onAnswer(false)} data-testid='lingo.flashcard.incorrect'>
            <Icon.Icon icon='ph--x--regular' size='md' />
            <span className='pl-2'>{t('incorrect.button')}</span>
          </Button.Root>
          <Button.Root variant='primary' onClick={() => onAnswer(true)} data-testid='lingo.flashcard.correct'>
            <Icon.Icon icon='ph--check--regular' size='md' />
            <span className='pl-2'>{t('correct.button')}</span>
          </Button.Root>
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};

Flashcard.displayName = 'Flashcard';
