//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';

import { alignSegments } from './align-segments';
import { type RawSegment, type Segmentation, SegmentKind } from './Segmentation';

/** Structural analysis is quotation, not reasoning, so the cheapest tier is the right default. */
export const SEGMENT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/**
 * LLM output schema. No offsets: the model quotes text verbatim and {@link alignSegments} computes
 * positions, because a model cannot count characters reliably but can copy a phrase exactly.
 *
 * Nesting is expressed three levels deep rather than recursively — `Schema.suspend` would let the
 * model return arbitrary depth, and every consumer here wants paragraph → sentence → clause/vocab.
 */
const RawVocab = Schema.Struct({
  text: Schema.String.annotate({ description: 'The term exactly as it appears in the source.' }),
  translation: Schema.optional(
    Schema.String.annotate({ description: 'The corresponding text in the translation, quoted exactly.' }),
  ),
  gloss: Schema.optional(Schema.String.annotate({ description: 'Meaning of the term in the base language.' })),
  lemma: Schema.optional(Schema.String.annotate({ description: 'Dictionary form, if the term is inflected.' })),
  reading: Schema.optional(Schema.String.annotate({ description: 'Pronunciation or romanization.' })),
});

const RawClause = Schema.Struct({
  text: Schema.String.annotate({ description: 'The clause exactly as it appears in the source.' }),
  translation: Schema.optional(
    Schema.String.annotate({ description: 'The corresponding clause in the translation, quoted exactly.' }),
  ),
  vocab: Schema.optional(Schema.Array(RawVocab)),
});

const RawSentence = Schema.Struct({
  text: Schema.String.annotate({ description: 'The sentence exactly as it appears in the source.' }),
  translation: Schema.optional(
    Schema.String.annotate({ description: 'The corresponding sentence in the translation, quoted exactly.' }),
  ),
  clauses: Schema.optional(Schema.Array(RawClause)),
});

const RawParagraph = Schema.Struct({
  text: Schema.String.annotate({ description: 'The paragraph exactly as it appears in the source.' }),
  translation: Schema.optional(
    Schema.String.annotate({ description: 'The corresponding paragraph in the translation, quoted exactly.' }),
  ),
  sentences: Schema.optional(Schema.Array(RawSentence)),
});

const AnalyzedText = Schema.Struct({
  paragraphs: Schema.Array(RawParagraph),
});
type AnalyzedText = Schema.Schema.Type<typeof AnalyzedText>;

export type SegmentTextOptions = {
  /** The same passage in the base language; enables paired ranges for cross-pane selection. */
  target?: string;
  /** Human-readable name of the language the source is written in (e.g. 'Japanese'). */
  sourceLanguage?: string;
  /** Human-readable name of the language being translated into (e.g. 'English'). */
  targetLanguage?: string;
  /** Granularities to ask for. Narrowing this shortens the reply and the latency. */
  kinds?: readonly SegmentKind[];
  /**
   * Pronunciation guide to attach to each vocabulary region (e.g. furigana, pinyin). Omitted, no
   * reading is requested — a reading is noise for a script the learner can already pronounce.
   */
  readingSystem?: string;
};

/** Flattens the depth-limited reply into the recursive shape the aligner walks. */
const toRawSegments = ({ paragraphs }: AnalyzedText): RawSegment[] =>
  paragraphs.map((paragraph) => ({
    kind: 'paragraph' as const,
    text: paragraph.text,
    translation: paragraph.translation,
    children: (paragraph.sentences ?? []).map((sentence) => ({
      kind: 'sentence' as const,
      text: sentence.text,
      translation: sentence.translation,
      children: (sentence.clauses ?? []).map((clause) => ({
        kind: 'clause' as const,
        text: clause.text,
        translation: clause.translation,
        children: (clause.vocab ?? []).map((vocab) => ({
          kind: 'vocab' as const,
          text: vocab.text,
          translation: vocab.translation,
          gloss: vocab.gloss,
          lemma: vocab.lemma,
          reading: vocab.reading,
        })),
      })),
    })),
  }));

const buildPrompt = (
  source: string,
  { target, sourceLanguage, targetLanguage, kinds, readingSystem }: SegmentTextOptions,
) => {
  const wanted = kinds ?? SegmentKind.literals;
  const lines = [
    'Analyze the passage below and return its structure as nested regions.',
    '',
    'Rules:',
    '- Quote every region verbatim from the passage. Do not paraphrase, normalize, or fix typos:',
    '  quoted text is matched against the source to compute character offsets, so an inexact quote',
    '  is discarded.',
    '- Cover the passage in order, without overlapping siblings.',
    `- Requested granularities: ${wanted.join(', ')}.`,
    '- A vocab region is a word or fixed phrase worth learning — content words and idioms, not',
    '  function words, punctuation, or numbers.',
  ];

  if (readingSystem) {
    lines.push(`- Give every vocab region a \`reading\`: ${readingSystem}.`);
  } else {
    lines.push('- Omit `reading`; this script needs no pronunciation guide.');
  }

  if (target) {
    lines.push(
      '- For every region, also quote the corresponding text from the translation, verbatim. Omit it',
      '  when the translation restructures the sentence and no contiguous span corresponds.',
    );
  }

  lines.push(
    '',
    sourceLanguage ? `Source language: ${sourceLanguage}` : '',
    targetLanguage ? `Translation language: ${targetLanguage}` : '',
    '',
    'Passage:',
    source,
  );

  if (target) {
    lines.push('', 'Translation:', target);
  }

  return lines.filter(Boolean).join('\n');
};

/**
 * Analyzes a passage into nested paragraph / sentence / clause / vocabulary regions, then
 * deterministically aligns them to character offsets in the source — and, when a translation is
 * supplied, in the translation too.
 *
 * Provides the LanguageModel internally; residual requirement is {@link AiService.AiService}.
 */
export const segmentText = (source: string, options: SegmentTextOptions = {}) =>
  Effect.gen(function* () {
    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({ schema: AnalyzedText, prompt: buildPrompt(source, options) }),
    );
    return alignSegments(source, toRawSegments(value), options.target);
  }).pipe(Effect.provide(AiService.model(SEGMENT_MODEL)));

/**
 * The pluggable analyzer contract, mirroring `Parser` for the editor extension and pipelines.
 *
 * Deliberately NOT the type of {@link segmentText}, which is an Effect program: a React consumer
 * takes this, and the caller wiring one up runs the program to a Promise at that boundary. The two
 * are not meant to unify — `Parser` and `parseText` stand in exactly the same relation.
 */
export type Segmenter = (source: string, options?: SegmentTextOptions) => Promise<Segmentation>;
