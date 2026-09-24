//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Analysis from './Analysis.ts';
import * as Language from './Language.ts';
import * as Vocabulary from './Vocabulary.ts';
import * as Word from './Word.ts';

/** One candidate produced by {@link ExtractVocabulary}, before it is written to a deck. */
export const Candidate = Schema.Struct({
  term: Schema.String,
  translation: Schema.String,
  lemma: Schema.optional(Schema.String),
  reading: Schema.optional(Schema.String),
  partOfSpeech: Schema.optional(Word.PartOfSpeech),
  /** A sentence from the source showing the term in use. */
  example: Schema.optional(Schema.String),
});
export interface Candidate extends Schema.Schema.Type<typeof Candidate> {}

/**
 * Analyzes a Text object and appends the vocabulary it finds to a deck.
 *
 * Terms already in the deck are skipped rather than duplicated, so the operation is safe to re-run
 * on a document that grew since the last pass.
 */
export const ExtractVocabulary = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.extractVocabulary'),
    name: 'Extract vocabulary',
    description: 'Extracts vocabulary from a text object and adds it to a vocabulary deck.',
    icon: 'ph--magic-wand--regular',
  },
  input: Schema.Struct({
    source: Ref.Ref(Text.Text).annotate({ description: 'The text to analyze.' }),
    vocabulary: Ref.Ref(Vocabulary.Vocabulary).annotate({ description: 'The deck to add the words to.' }),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum number of new words to add.' })),
  }),
  output: Schema.Struct({
    words: Schema.Array(Ref.Ref(Word.Word)).annotate({ description: 'The words added to the deck.' }),
    skipped: Schema.Number.annotate({ description: 'Candidates already present in the deck.' }),
  }),
  services: [Database.Service, AiService.AiService],
});

/** Adds a single word to a deck, deduplicating on the term. */
export const AddWord = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.addWord'),
    name: 'Add word',
    description: 'Adds a word to a vocabulary deck.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    vocabulary: Ref.Ref(Vocabulary.Vocabulary),
    term: Schema.String,
    translation: Schema.String,
    lemma: Schema.optional(Schema.String),
    reading: Schema.optional(Schema.String),
    partOfSpeech: Schema.optional(Word.PartOfSpeech),
    examples: Schema.optional(Schema.Array(Schema.String)),
  }),
  output: Schema.Struct({
    word: Ref.Ref(Word.Word),
    /** True when the term was already in the deck and the existing word was returned. */
    existing: Schema.Boolean,
  }),
  services: [Database.Service],
});

/** Records one flashcard answer and advances the word's Leitner schedule. */
export const RecordReview = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.recordReview'),
    name: 'Record review',
    description: 'Records a flashcard answer and updates the word score.',
    icon: 'ph--check-circle--regular',
  },
  input: Schema.Struct({
    word: Ref.Ref(Word.Word),
    correct: Schema.Boolean,
  }),
  output: Schema.Struct({
    progress: Word.Progress,
  }),
  services: [Database.Service],
});

/**
 * Translates a single term in context. Backs the reader's hover card for words no deck contains;
 * the result is not persisted until the user adds it via {@link AddWord}.
 */
export const TranslateTerm = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.translateTerm'),
    name: 'Translate term',
    description: 'Translates a single term, optionally using the surrounding sentence for context.',
    icon: 'ph--translate--regular',
  },
  input: Schema.Struct({
    term: Schema.String,
    language: Ref.Ref(Language.Language),
    context: Schema.optional(Schema.String.annotate({ description: 'The sentence the term appeared in.' })),
  }),
  output: Candidate,
  services: [Database.Service, AiService.AiService],
});

/**
 * Analyzes a passage into nested paragraph / sentence / clause / vocabulary ranges and caches the
 * result on an {@link Analysis.Analysis} object.
 *
 * Re-running is cheap by design: an analysis whose `sourceHash` still matches is returned as-is, so
 * reopening a document costs a query rather than a model call.
 */
export const AnalyzeText = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.analyzeText'),
    name: 'Analyze text',
    description: 'Analyzes a passage into paragraph, sentence, clause and vocabulary ranges.',
    icon: 'ph--brackets-angle--regular',
  },
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotate({ description: 'The object whose text is being analyzed.' }),
    text: Schema.String.annotate({ description: 'The source text.' }),
    language: Ref.Ref(Language.Language),
    translation: Schema.optional(
      Schema.String.annotate({ description: 'The same passage in the base language, for paired ranges.' }),
    ),
    /** Where to file the vocabulary the analysis found; omitted, nothing is harvested. */
    vocabulary: Schema.optional(Ref.Ref(Vocabulary.Vocabulary)),
    /** Forces a fresh analysis even when a matching one is cached. */
    refresh: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    analysis: Ref.Ref(Analysis.Analysis),
    /** True when a cached analysis was returned without calling the model. */
    cached: Schema.Boolean,
    /** Words added to the word list from this analysis. */
    added: Schema.Number,
  }),
  services: [Database.Service, AiService.AiService],
});

/**
 * Translates a whole passage into the learner's base language, preserving its markdown structure.
 *
 * Distinct from swapping known terms inline: the split view's second pane is a reading of the
 * entire article, so grammar and word order have to move too, which only a passage-level pass does.
 */
export const TranslatePassage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lingo.translatePassage'),
    name: 'Translate passage',
    description: 'Translates an entire passage into the base language, preserving markdown.',
    icon: 'ph--translate--regular',
  },
  input: Schema.Struct({
    text: Schema.String.annotate({ description: 'The passage to translate.' }),
    language: Ref.Ref(Language.Language),
  }),
  output: Schema.Struct({
    text: Schema.String.annotate({ description: 'The passage in the target language.' }),
    /** The language the passage turned out to be in; the reader records it as the study language. */
    sourceCode: Schema.optional(Schema.String.annotate({ description: 'BCP-47 tag detected in the source.' })),
  }),
  services: [Database.Service, AiService.AiService],
});
