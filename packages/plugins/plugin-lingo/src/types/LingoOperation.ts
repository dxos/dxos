//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Language from './Language';
import * as Vocabulary from './Vocabulary';
import * as Word from './Word';

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
    key: DXN.make('org.dxos.plugin.lingo.operation.extractVocabulary'),
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
    key: DXN.make('org.dxos.plugin.lingo.operation.addWord'),
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
    key: DXN.make('org.dxos.plugin.lingo.operation.recordReview'),
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
    key: DXN.make('org.dxos.plugin.lingo.operation.translateTerm'),
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
 * Translates a whole passage into the learner's base language, preserving its markdown structure.
 *
 * Distinct from swapping known terms inline: the split view's second pane is a reading of the
 * entire article, so grammar and word order have to move too, which only a passage-level pass does.
 */
export const TranslatePassage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.lingo.operation.translatePassage'),
    name: 'Translate passage',
    description: 'Translates an entire passage into the base language, preserving markdown.',
    icon: 'ph--translate--regular',
  },
  input: Schema.Struct({
    text: Schema.String.annotate({ description: 'The passage to translate.' }),
    language: Ref.Ref(Language.Language),
  }),
  output: Schema.Struct({
    text: Schema.String.annotate({ description: 'The passage in the base language.' }),
  }),
  services: [Database.Service, AiService.AiService],
});
