//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { Flashcard } from '#components';
import { meta } from '#meta';
import { LingoOperation, type Vocabulary, Word } from '#types';

import { useDeckWords } from '../useDeckWords.ts';

export type FlashcardsArticleProps = AppSurface.ObjectArticleProps<Vocabulary.Vocabulary>;

/**
 * Companion drill for a deck: due cards first, self-graded, each answer written straight through
 * to the word's Leitner schedule so a session can be abandoned mid-way without losing progress.
 */
export const FlashcardsArticle = ({ role, subject: deck, attendableId }: FlashcardsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // `Menu.Toolbar` gates itself on `useAttention(attendableId)`, so without an id the toolbar is
  // permanently disabled; fall back to the subject's URI when the surface supplies none.
  const attentionId = attendableId ?? Obj.getURI(deck);
  const words = useDeckWords(deck);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState({ correct: 0, answered: 0 });

  // The queue is frozen for the session: re-sorting after each answer would jump the card the user
  // just graded to a new position and re-show it immediately.
  // Membership, not count: swapping one word for another leaves the length unchanged, and the queue
  // would go on drilling a word the deck no longer holds.
  const membership = words.map((word) => word.id).join(',');
  const queue = useMemo(() => {
    const now = new Date();
    return [...words].sort((a, b) => Number(Word.isDue(b, now)) - Number(Word.isDue(a, now)));
  }, [membership, deck?.id]);

  const word = queue[index];

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (!word) {
        return;
      }

      setSession(({ correct: priorCorrect, answered }) => ({
        correct: priorCorrect + (correct ? 1 : 0),
        answered: answered + 1,
      }));
      setRevealed(false);
      setIndex((index) => index + 1);

      void invokePromise?.(
        LingoOperation.RecordReview,
        { word: Ref.make(word), correct },
        {
          spaceId: Obj.getDatabase(word)?.spaceId,
          notify: { error: ['record-review-error.message', { ns: meta.profile.key }] },
        },
      );
    },
    [invokePromise, word],
  );

  const handleRestart = useCallback(() => {
    setIndex(0);
    setRevealed(false);
    setSession({ correct: 0, answered: 0 });
  }, []);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'restart',
          {
            label: ['restart.label', { ns: meta.profile.key }],
            icon: 'ph--arrow-counter-clockwise--regular',
            disposition: 'toolbar',
            testId: 'lingo.flashcards.restart',
          },
          handleRestart,
        )
        .build(),
    [handleRestart],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attentionId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-expand'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content classNames='flex flex-col'>
          {word ? (
            <Flashcard
              key={word.id}
              word={word}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onAnswer={handleAnswer}
            />
          ) : (
            <div className='flex flex-col items-center gap-2 p-8 text-description'>
              <span>{queue.length === 0 ? t('empty-deck.message') : t('session-complete.message')}</span>
              {session.answered > 0 && <span>{t('session-score.message', session)}</span>}
            </div>
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

FlashcardsArticle.displayName = 'FlashcardsArticle';
