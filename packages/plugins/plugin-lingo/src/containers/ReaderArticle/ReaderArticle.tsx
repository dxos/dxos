//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { ReaderPane } from '#components';
import { type VocabularyEntry, type VocabularyLookup, normalizeToken } from '#extensions';
import { meta } from '#meta';
import { LingoCapabilities, LingoOperation, type LingoSettings, Vocabulary, Word } from '#types';

import { createTooltipRenderer } from './renderTooltip';
import { useSourceText } from './useSourceText';

const MODES = [
  { value: 'original', icon: 'ph--text-align-left--regular' },
  { value: 'translation', icon: 'ph--translate--regular' },
  { value: 'split', icon: 'ph--columns--regular' },
] as const satisfies ReadonlyArray<{ value: LingoSettings.RevealMode; icon: string }>;

export type ReaderArticleProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Companion reading view for any object with text — a markdown document, an email, a transcript.
 *
 * Read-only and non-destructive: it renders a copy of the source text with the reader's vocabulary
 * revealed, so the document keeps whatever editor its own plugin gives it.
 */
export const ReaderArticle = ({ role, subject, attendableId }: ReaderArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // `Menu.Toolbar` gates itself on `useAttention(attendableId)`, so without an id the toolbar is
  // permanently disabled; fall back to the subject's URI when the surface supplies none.
  const attentionId = attendableId ?? (subject && Obj.getURI(subject));
  const settings = useAtomValue(useCapability(LingoCapabilities.Settings));
  const { text, textRef } = useSourceText(subject);

  const db = subject ? Obj.getDatabase(subject) : undefined;
  const decks = useQuery(db, Filter.type(Vocabulary.Vocabulary));
  const [deckId, setDeckId] = useState<string | undefined>();
  const deck = decks.find(({ id }) => id === deckId) ?? decks[0];

  // Look across every deck for the language, not just the selected one: the selected deck is where
  // new words are filed, but a term the learner already knows from another deck is still known.
  const wordFilter = useMemo(() => Filter.type(Word.Word, deck ? { language: deck.language } : {}), [deck]);
  const words = useQuery(deck ? db : undefined, wordFilter);

  const [mode, setMode] = useState<LingoSettings.RevealMode>(settings.revealMode);

  const lookup = useMemo<VocabularyLookup>(() => {
    const index = new Map<string, VocabularyEntry>();
    for (const word of words) {
      const entry: VocabularyEntry = {
        term: word.term,
        translation: word.translation,
        reading: word.reading,
        partOfSpeech: word.partOfSpeech,
        wordId: word.id,
      };
      index.set(normalizeToken(word.term), entry);
      if (word.lemma) {
        index.set(normalizeToken(word.lemma), entry);
      }
    }
    return (token) => index.get(token);
  }, [words]);

  const handleAddWord = useCallback(
    ({ token, context }: { token: string; context: string }) => {
      if (!deck || !invokePromise) {
        return;
      }

      // Translate first, then file the result: the tooltip's "add" is one gesture for the learner,
      // even though the translation has to round-trip through the assistant.
      void invokePromise(
        LingoOperation.TranslateTerm,
        { term: token, language: deck.language, context },
        { spaceId: db?.spaceId, notify: { error: ['translate-error.message', { ns: meta.profile.key }] } },
      ).then((result) => {
        if (!result.data) {
          return;
        }
        return invokePromise(
          LingoOperation.AddWord,
          { vocabulary: Ref.make(deck), ...result.data },
          { spaceId: db?.spaceId, notify: { error: ['add-word-error.message', { ns: meta.profile.key }] } },
        );
      });
    },
    [db, deck, invokePromise],
  );

  const render = useMemo(
    () => createTooltipRenderer({ t, onAdd: deck && settings.translateUnknownWords ? handleAddWord : undefined }),
    [t, deck, settings.translateUnknownWords, handleAddWord],
  );

  // The whole passage in the base language, for the split view's second pane. Keyed by the text it
  // was produced from so a document edit invalidates it rather than showing a stale translation.
  const [passage, setPassage] = useState<{ source: string; text: string }>();
  useEffect(() => {
    if (mode !== 'split' || !text || !deck || !invokePromise || passage?.source === text) {
      return;
    }

    let cancelled = false;
    void invokePromise(
      LingoOperation.TranslatePassage,
      { text, language: deck.language },
      { spaceId: db?.spaceId, notify: { error: ['translate-error.message', { ns: meta.profile.key }] } },
    ).then((result) => {
      if (!cancelled && result.data) {
        setPassage({ source: text, text: result.data.text });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, text, deck, db, invokePromise, passage?.source]);

  const handleExtract = useCallback(() => {
    if (!deck || !textRef || !invokePromise) {
      return;
    }

    void invokePromise(
      LingoOperation.ExtractVocabulary,
      { source: textRef, vocabulary: Ref.make(deck) },
      { spaceId: db?.spaceId, notify: { error: ['extract-error.message', { ns: meta.profile.key }] } },
    );
  }, [db, deck, textRef, invokePromise]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'mode',
          {
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: mode,
            label: ['mode.label', { ns: meta.profile.key }],
          },
          (group) => {
            MODES.forEach(({ value, icon }) => {
              group.action(value, { label: [`mode-${value}.label`, { ns: meta.profile.key }], icon }, () =>
                setMode(value),
              );
            });
          },
        )
        .separator()
        .group(
          'deck',
          {
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: deck?.id,
            label: ['deck.label', { ns: meta.profile.key }],
          },
          (group) => {
            decks.forEach((option) => {
              group.action(
                option.id,
                { label: option.name ?? t('untitled-deck.label'), icon: 'ph--cards--regular' },
                () => setDeckId(option.id),
              );
            });
          },
        )
        .separator()
        .action(
          'extract',
          {
            label: ['extract.label', { ns: meta.profile.key }],
            icon: 'ph--magic-wand--regular',
            disposition: 'toolbar',
            disabled: !deck || !textRef,
            testId: 'lingo.reader.extract',
          },
          handleExtract,
        )
        .build(),
    [mode, deck, decks, textRef, handleExtract, t],
  );

  const paneProps = {
    content: text ?? '',
    lookup,
    locale: deck?.language.target?.code,
    render,
    highlight: settings.highlightKnownWords,
  };

  return (
    <Menu.Root {...menuActions} attendableId={attentionId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-container'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container'>
          {text === undefined ? (
            <div className='p-8 text-description'>{t('no-text.message')}</div>
          ) : mode === 'split' ? (
            // Both panes render markdown identically so the two columns stay line-for-line
            // comparable. The second is the whole article translated, not the source with known
            // terms swapped — until it arrives, the term swap stands in.
            <div className='grid grid-cols-2 gap-2 min-h-0'>
              <ReaderPane {...paneProps} />
              {passage?.source === text ? (
                <ReaderPane {...paneProps} content={passage.text} highlight={false} render={undefined} />
              ) : (
                <ReaderPane {...paneProps} translate />
              )}
            </div>
          ) : (
            <ReaderPane {...paneProps} translate={mode === 'translation'} />
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

ReaderArticle.displayName = 'ReaderArticle';
