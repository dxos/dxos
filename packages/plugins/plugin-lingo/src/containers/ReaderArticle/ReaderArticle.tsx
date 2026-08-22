//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { ReaderPane } from '#components';
import {
  type SegmentTooltipProps,
  type VocabularyEntry,
  type VocabularyLookup,
  createTooltipRenderer,
  deckSegments,
  mergeSegmentations,
  normalizeToken,
} from '#extensions';
import { meta } from '#meta';
import { Analysis, Language, LingoCapabilities, LingoOperation, type LingoSettings, Vocabulary, Word } from '#types';

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

  // Language is the primary choice: it decides what is translated and how the text is segmented,
  // and the deck is only where harvested words are filed.
  const languages = useQuery(db, Filter.type(Language.Language));
  const [languageId, setLanguageId] = useState<string | undefined>();
  const language = languages.find(({ id }) => id === languageId) ?? languages[0];

  const allDecks = useQuery(db, Filter.type(Vocabulary.Vocabulary));
  const decks = useMemo(
    () => (language ? allDecks.filter((candidate) => candidate.language.uri === Obj.getURI(language)) : allDecks),
    [allDecks, language],
  );
  const [deckId, setDeckId] = useState<string | undefined>();
  const deck = decks.find(({ id }) => id === deckId) ?? decks[0];
  const languageRef = language ? Ref.make(language) : deck?.language;

  // Look across every deck for the language, not just the selected one: the selected deck is where
  // new words are filed, but a term the learner already knows from another deck is still known.
  const wordFilter = useMemo(() => Filter.type(Word.Word, languageRef ? { language: languageRef } : {}), [languageRef]);
  const words = useQuery(languageRef ? db : undefined, wordFilter);

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
    ({ text: token, context }: SegmentTooltipProps) => {
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
    () =>
      createTooltipRenderer({
        t,
        lookup,
        onAdd: deck && settings.translateUnknownWords ? handleAddWord : undefined,
      }),
    [t, lookup, deck, settings.translateUnknownWords, handleAddWord],
  );

  // The whole passage in the base language, for the split view's second pane. Keyed by the text it
  // was produced from so a document edit invalidates it rather than showing a stale translation.
  const [passage, setPassage] = useState<{ source: string; text: string }>();
  const [running, setRunning] = useState(false);

  // Only meaningful while it still describes the current text.
  const passageText = passage && passage.source === text ? passage.text : undefined;

  // The cached analysis for this subject, if one has been computed. Reading it from the database
  // rather than holding the operation's result keeps a re-analysis in another pane visible here.
  const analyses = useQuery(db, Filter.type(Analysis.Analysis));
  const subjectUri = subject && Obj.getURI(subject);
  const stored = analyses.find((candidate) => candidate.subject.uri === subjectUri);
  const analysis = useMemo(() => {
    // Deck vocabulary is deterministic and needs no model, so it decorates before (and without) an
    // analysis; analyzed vocab wins where the two overlap.
    const locale = language?.code;
    const deckOnly = text ? deckSegments(text, lookup, locale) : undefined;
    if (!text || !stored || Analysis.isStale(stored, text)) {
      return deckOnly;
    }

    return mergeSegmentations(
      {
        sourceHash: stored.sourceHash,
        targetHash: stored.targetHash,
        segments: [...stored.segments],
      },
      deckOnly!,
    );
  }, [text, stored, lookup, language]);

  // The structural selection, shared by both panes: selecting a clause in one addresses the same
  // clause in the other, which is the whole point of the paired ranges.
  const [selected, setSelected] = useState<string>();
  const handleSelect = useCallback((segment?: { id: string }) => setSelected(segment?.id), []);

  // The committed segment, resolved to its text, is what the toolbar acts on.
  const selectedSegment = selected && analysis?.segments.find((segment) => segment.id === selected);
  const selectedText =
    selectedSegment && text ? text.slice(selectedSegment.source.start, selectedSegment.source.end) : undefined;

  const handleAddSelection = useCallback(() => {
    if (!selectedSegment || !selectedText) {
      return;
    }

    handleAddWord({
      segment: selectedSegment,
      text: selectedText,
      context: text?.slice(0, selectedSegment.source.end).split('\n').pop() ?? selectedText,
    });
  }, [selectedSegment, selectedText, text, handleAddWord]);

  // Translation then analysis, in that order and as one gesture: the analysis pairs each range with
  // its counterpart in the translation, so running it first would produce source-only segments.
  const handleRun = useCallback(async () => {
    if (!subject || !text || !languageRef || !invokePromise) {
      return;
    }

    setRunning(true);
    try {
      const translated = await invokePromise(
        LingoOperation.TranslatePassage,
        { text, language: languageRef },
        { spaceId: db?.spaceId, notify: { error: ['translate-error.message', { ns: meta.profile.key }] } },
      );

      const translation = translated.data?.text;
      if (translation) {
        setPassage({ source: text, text: translation });
      }

      await invokePromise(
        LingoOperation.AnalyzeText,
        { subject: Ref.make(subject), text, language: languageRef, translation, refresh: true },
        { spaceId: db?.spaceId, notify: { error: ['analyze-error.message', { ns: meta.profile.key }] } },
      );
    } finally {
      setRunning(false);
    }
  }, [db, subject, text, languageRef, invokePromise]);

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
          'language',
          {
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: language?.id,
            label: ['language.label', { ns: meta.profile.key }],
          },
          (group) => {
            languages.forEach((option) => {
              group.action(option.id, { label: option.name, icon: 'ph--globe--regular' }, () =>
                setLanguageId(option.id),
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
          'add-selection',
          {
            label: ['add-phrase.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
            disabled: !deck || !selectedText,
            testId: 'lingo.reader.add-selection',
          },
          handleAddSelection,
        )
        .action(
          'run',
          {
            label: ['run.label', { ns: meta.profile.key }],
            icon: running ? 'ph--spinner--regular' : 'ph--play--regular',
            disposition: 'toolbar',
            disabled: running || !languageRef || !text,
            testId: 'lingo.reader.run',
          },
          handleRun,
        )
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
    [
      mode,
      language,
      languages,
      deck,
      decks,
      text,
      textRef,
      running,
      selectedText,
      handleAddSelection,
      handleRun,
      handleExtract,
      t,
    ],
  );

  const paneProps = {
    content: text ?? '',
    analysis: settings.highlightKnownWords ? analysis : undefined,
    selected,
    render,
    onSelect: handleSelect,
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
              <ReaderPane {...paneProps} side='source' />
              <ReaderPane {...paneProps} side='target' content={passageText ?? text ?? ''} />
            </div>
          ) : (
            <ReaderPane
              {...paneProps}
              {...(mode === 'translation' && { side: 'target', content: passageText ?? text ?? '' })}
            />
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

ReaderArticle.displayName = 'ReaderArticle';
