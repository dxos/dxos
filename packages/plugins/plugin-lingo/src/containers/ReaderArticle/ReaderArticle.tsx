//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { sourceHash } from '@dxos/nlp';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { HasSubject } from '@dxos/types';

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
import { Analysis, Language, LingoCapabilities, LingoOperation, Vocabulary, Word } from '#types';

import { useSourceText } from './useSourceText';

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
  // Attention sits on the article this companion accompanies, not on the companion itself, so the
  // subject's URI is what `Menu.Toolbar`'s `useAttention` has to match — otherwise the toolbar is
  // permanently disabled.
  const attentionId = (subject && Obj.getURI(subject)) ?? attendableId;
  const settings = useAtomValue(useCapability(LingoCapabilities.Settings));
  const { text, textRef } = useSourceText(subject);

  const db = subject ? Obj.getDatabase(subject) : undefined;

  // Language is the primary choice: it decides what is translated and how the text is segmented,
  // and the deck is only where harvested words are filed.
  const languages = useQuery(db, Filter.type(Language.Language));
  const relations = useQuery(db, Filter.type(HasSubject.HasSubject));

  // Languages already translating THIS object, by code — the tick in the selector, and what decides
  // whether the run button has to create one first.
  const translated = useMemo(() => {
    const codes = new Map<string, Language.Language>();
    for (const relation of relations) {
      const source = Relation.getSource(relation);
      const target = Relation.getTarget(relation);
      // Compared by id: a same-space ref stores an unqualified URI, so a URI comparison silently
      // never matches. `HasSubject` is shared, so the source type is what marks this a translation.
      if (Language.instanceOf(source) && target?.id === subject?.id) {
        codes.set(Language.getBaseCode(source), source);
      }
    }
    return codes;
  }, [relations, subject]);

  // Every popular language is offered even in an empty space; those already created for this object
  // take its place in the list so the selection resolves to a real object.
  const options = useMemo(
    () =>
      Language.POPULAR.map(({ code, name }) => ({ code, name: translated.get(code)?.name ?? name }))
        .concat(
          languages
            .filter(({ code }) => !Language.POPULAR.some((popular) => popular.code === code))
            .map(({ code, name }) => ({ code, name })),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [languages, translated],
  );

  const [languageCode, setLanguageCode] = useState<string | undefined>();
  // Settings before the first option: the list is sorted for reading, so falling straight through to
  // it opened every reader on Arabic. A language already created for this object still wins — it is
  // the one with a translation attached.
  const preferred = options.some(({ code }) => code === settings.language)
    ? settings.language
    : Language.DEFAULT_BASE_CODE;
  const code = languageCode ?? [...translated.keys()][0] ?? preferred ?? options[0]?.code;
  const language = code ? translated.get(code) : undefined;

  const allDecks = useQuery(db, Filter.type(Vocabulary.Vocabulary));
  const decks = useMemo(
    () => (language ? allDecks.filter((candidate) => candidate.language.uri === Obj.getURI(language)) : allDecks),
    [allDecks, language],
  );
  const [deckId, setDeckId] = useState<string | undefined>();
  const deck = decks.find(({ id }) => id === deckId) ?? decks[0];
  const languageRef = language ? Ref.make(language) : undefined;

  // Look across every deck for the language, not just the selected one: the selected deck is where
  // new words are filed, but a term the learner already knows from another deck is still known.
  const wordFilter = useMemo(() => Filter.type(Word.Word, languageRef ? { language: languageRef } : {}), [languageRef]);
  const words = useQuery(languageRef ? db : undefined, wordFilter);

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

  // Remembers every deck this component created, keyed by language: `deck` comes from a query that
  // refreshes a tick after `db.add`, so a second "add" pressed before then would see no deck and
  // create another for the same language. A map rather than one slot — switching language and back
  // within that window would otherwise evict the entry that was about to be reused.
  const createdDecks = useRef(new Map<string, Vocabulary.Vocabulary>());
  const ensureDeck = useCallback(() => {
    if (deck || !db || !language) {
      return deck;
    }

    const created = createdDecks.current.get(language.id);
    if (created) {
      return created;
    }

    const deckForLanguage = db.add(Vocabulary.make({ name: language.name, language: Ref.make(language) }));
    createdDecks.current.set(language.id, deckForLanguage);
    return deckForLanguage;
  }, [db, deck, language]);

  const handleAddWord = useCallback(
    ({ text: token, context }: SegmentTooltipProps) => {
      const list = ensureDeck();
      if (!list || !invokePromise) {
        return;
      }

      // Translate first, then file the result: the tooltip's "add" is one gesture for the learner,
      // even though the translation has to round-trip through the assistant.
      void invokePromise(
        LingoOperation.TranslateTerm,
        { term: token, language: list.language, context },
        { spaceId: db?.spaceId, notify: { error: ['translate-error.message', { ns: meta.profile.key }] } },
      ).then((result) => {
        if (!result.data) {
          return;
        }
        // `Candidate` carries a single `example`; `AddWord` takes `examples`. Spreading one into the
        // other sends an extraneous key, and `invoke` rejects input that does not match the schema.
        const { example, ...candidate } = result.data;
        return invokePromise(
          LingoOperation.AddWord,
          { vocabulary: Ref.make(list), ...candidate, examples: example ? [example] : undefined },
          { spaceId: db?.spaceId, notify: { error: ['add-word-error.message', { ns: meta.profile.key }] } },
        );
      });
    },
    [db, ensureDeck, invokePromise],
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

  const [running, setRunning] = useState(false);

  // The stored analysis is the only source of truth for the translation: holding it in component
  // state instead meant switching to a language that already had one showed nothing.
  const analysisFilter = useMemo(
    () =>
      Filter.type(
        Analysis.Analysis,
        subject && language ? { subject: Ref.make(subject), language: Ref.make(language) } : {},
      ),
    [subject, language],
  );
  const analyses = useQuery(subject && language ? db : undefined, analysisFilter);
  const stored = analyses[0];
  const passageText = stored && text && !Analysis.isStale(stored, text) ? stored.translation : undefined;
  const analysis = useMemo(() => {
    // Deck vocabulary is deterministic and needs no model, so it decorates before (and without) an
    // analysis; analyzed vocab wins where the two overlap.
    const locale = language?.code || undefined;
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
    // Depends on the analysis's CONTENTS, not its identity: `AnalyzeText` mutates the stored object
    // in place, so a reference check would keep serving the pre-analysis segments forever.
  }, [text, stored, stored?.segments.length, stored?.translation, lookup, language]);

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
  // Removing a translation removes the relation too, so the tick clears and the language stops
  // being offered as already-translated; the Language object survives, since another object may
  // still be translated into it.
  const handleDelete = useCallback(() => {
    if (!db || !stored || !language || !subject) {
      return;
    }

    db.remove(stored);
    for (const relation of relations) {
      if (Relation.getSource(relation)?.id === language.id && Relation.getTarget(relation)?.id === subject.id) {
        db.remove(relation);
      }
    }
  }, [db, stored, language, subject, relations]);

  const handleRun = useCallback(async () => {
    if (!subject || !text || !code || !db || !invokePromise) {
      return;
    }

    // TESTING.md B5: pressing again on an unchanged document must come back from the stored
    // `Analysis` rather than spend a second translation. The guard belongs here because the
    // `AnalyzeText` call below passes `refresh: true`, which deliberately bypasses its own cache —
    // and `TranslatePassage`, the expensive half, has no cache at all. An analysis whose
    // segmentation failed still has work left, so an empty `segments` is not a hit.
    if (stored && !Analysis.isStale(stored, text) && stored.segments.length > 0) {
      return;
    }

    setRunning(true);
    try {
      // Choosing a language the object has no translation for is the act of creating one; the
      // relation is what the tick and the next visit read.
      let target = language;
      if (!target) {
        const name = options.find((option) => option.code === code)?.name ?? code;
        // `baseCode` is the target the user picked; `code` is the source, inferred from the document
        // by the translation itself rather than chosen here.
        target = db.add(Language.make({ name, code: '', baseCode: code }));
        db.add(HasSubject.make({ [Relation.Source]: target, [Relation.Target]: subject }));
      }

      const languageRef = Ref.make(target);
      const result = await invokePromise(
        LingoOperation.TranslatePassage,
        { text, language: languageRef },
        { spaceId: db.spaceId, notify: { error: ['translate-error.message', { ns: meta.profile.key }] } },
      );

      // Persist the translation the moment it arrives, rather than letting `AnalyzeText` be the only
      // writer: the translation is the expensive artifact, and a failed segmentation must not throw
      // it away — that is what left the panel reading "Not translated yet." after a successful run.
      const translation = result.data?.text;
      const sourceCode = result.data?.sourceCode;
      if (sourceCode && target.code !== sourceCode) {
        Obj.update(target, (target) => {
          target.code = sourceCode;
        });
      }

      if (translation) {
        const current = target === language ? stored : undefined;
        if (current) {
          Obj.update(current, (current) => {
            current.sourceHash = sourceHash(text);
            current.translation = translation;
          });
        } else {
          db.add(
            Analysis.make({
              subject: Ref.make(subject),
              language: languageRef,
              sourceHash: sourceHash(text),
              translation,
              segments: [],
            }),
          );
        }
      }

      const list = ensureDeck();
      await invokePromise(
        LingoOperation.AnalyzeText,
        {
          subject: Ref.make(subject),
          text,
          language: languageRef,
          translation,
          vocabulary: list && Ref.make(list),
          refresh: true,
        },
        { spaceId: db.spaceId, notify: { error: ['analyze-error.message', { ns: meta.profile.key }] } },
      );
    } finally {
      setRunning(false);
    }
  }, [db, stored, subject, text, textRef, ensureDeck, code, language, options, invokePromise]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'language',
          {
            variant: 'dropdownMenu',
            selectCardinality: 'single',
            applyActive: true,
            value: code,
            icon: 'ph--globe--regular',
            label: ['language.label', { ns: meta.profile.key }],
          },
          (group) => {
            options.forEach((option) => {
              group.action(
                option.code,
                {
                  label: option.name,
                  // A tick marks a language this object already has a translation for.
                  icon: translated.has(option.code) ? 'ph--check--regular' : 'ph--globe--regular',
                  checked: option.code === code,
                },
                () => setLanguageCode(option.code),
              );
            });
          },
        )
        .separator()
        .group(
          'deck',
          {
            variant: 'dropdownMenu',
            selectCardinality: 'single',
            applyActive: true,
            value: deck?.id,
            icon: 'ph--cards--regular',
            label: ['deck.label', { ns: meta.profile.key }],
            disabled: decks.length === 0,
          },
          (group) => {
            decks.forEach((option) => {
              group.action(
                option.id,
                {
                  label: option.name ?? t('untitled-deck.label'),
                  icon: 'ph--cards--regular',
                  checked: option.id === deck?.id,
                },
                () => setDeckId(option.id),
              );
            });
          },
        )
        .action(
          'add-selection',
          {
            label: ['add-phrase.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
            disabled: !language || !selectedText,
            testId: 'lingo.reader.add-selection',
          },
          handleAddSelection,
        )
        .action(
          'run',
          {
            label: ['run.label', { ns: meta.profile.key }],
            icon: running ? 'ph--spinner--regular' : 'ph--translate--regular',
            spin: running,
            disposition: 'toolbar',
            disabled: running || !code || !text,
            testId: 'lingo.reader.run',
          },
          handleRun,
        )
        .menu('overflow', (menu) => {
          menu.action(
            'delete',
            {
              label: ['delete-translation.label', { ns: meta.profile.key }],
              icon: 'ph--trash--regular',
              disabled: !stored,
              testId: 'lingo.reader.delete',
            },
            handleDelete,
          );
        })
        .build(),
    [
      code,
      options,
      translated,
      deck,
      decks,
      text,
      textRef,
      running,
      selectedText,
      stored,
      handleDelete,
      handleAddSelection,
      handleRun,
      t,
    ],
  );

  const paneProps = {
    analysis: settings.highlightKnownWords ? analysis : undefined,
    selected,
    render,
    onSelect: handleSelect,
  };

  return (
    <Menu.Root {...menuActions} attendableId={attentionId} alwaysActive>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-expand'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        {/* The editor scrolls itself, so the panel must not: it only supplies the box to fill. */}
        <Panel.Content classNames='flex flex-col'>
          {text === undefined ? (
            <div className='p-8 text-description'>{t('no-text.message')}</div>
          ) : passageText === undefined ? (
            // Never stand in the source: the document itself is already on screen beside this
            // companion, so a duplicate reads as a broken pane rather than a useful fallback.
            <div className='p-8 text-description'>{t('not-translated.message')}</div>
          ) : (
            <ReaderPane {...paneProps} side='target' content={passageText} images={false} />
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

ReaderArticle.displayName = 'ReaderArticle';
