//
// Copyright 2024 DXOS.org
//

// Operation definitions for the transcript enrichment pipeline (see ENRICHMENT.md).
//
// **Stub status.** The handlers below return deterministic dummy values rather than calling
// an LLM; they exist so the end-to-end test harness (`conversation.test.ts`) can exercise
// the schemas, the operation wiring, and the streaming/orchestration code paths without
// requiring an Anthropic key on first run. The real handlers will replace these stubs in
// a follow-up PR (calling `LanguageModel.generateObject(...)`) while keeping the same
// inputs / outputs.

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const NAMESPACE = `${meta.profile.key}.enrichment`;

//
// Shared sub-schemas.
//

/** A noun / proper noun surfaced for follow-up actions (create object, research, link…). */
export const CandidateMention = Schema.Struct({
  text: Schema.String.annotations({ description: 'Surface form as it appears in the transcript.' }),
  kind: Schema.Literal('noun', 'proper-noun').annotations({
    description: 'Whether this is a common noun (e.g. "team") or a proper noun (e.g. "Munich").',
  }),
  start: Schema.Number.annotations({ description: 'Character offset within the corrected text.' }),
  end: Schema.Number.annotations({ description: 'Character offset within the corrected text.' }),
  suggested: Schema.optional(
    Schema.Struct({
      typename: Schema.String.annotations({
        description: 'Optional hint for the ECHO type the user might create (e.g. "org.dxos.type.organization").',
      }),
    }),
  ),
});

/** Per-block enrichment output produced by Pass A. */
export const EnrichmentBlock = Schema.Struct({
  /** Index into the input window; lets the caller match enrichment to the originating block. */
  index: Schema.Number,
  /** Corrected text — punctuation, capitalization, words split across batch boundaries reassembled. */
  corrected: Schema.String,
  /**
   * IDs of ECHO objects the LLM is confident the block mentions. Strings rather than `Ref<T>`
   * to keep the schema serialisable; the consumer resolves them via `Database.resolve(...)`.
   */
  referenceIds: Schema.Array(Schema.String),
  /** Candidate nouns / proper nouns not already covered by `referenceIds`. */
  candidates: Schema.Array(CandidateMention),
});

//
// Pass A — enrichment (per Whisper batch / sliding window).
//

export const EnrichmentInput = Schema.Struct({
  /** Sliding-window blocks. Each carries the speaker that produced it. */
  window: Schema.Array(
    Schema.Struct({
      speaker: Schema.String,
      text: Schema.String,
      started: Schema.String,
    }),
  ),
  /** ECHO objects available in the space that the LLM may pick from when linking references. */
  knownEntities: Schema.optional(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        typename: Schema.String,
        name: Schema.String,
      }),
    ),
  ),
});
export type EnrichmentInputType = Schema.Schema.Type<typeof EnrichmentInput>;

export const EnrichmentOutput = Schema.Struct({
  blocks: Schema.Array(EnrichmentBlock),
});
export type EnrichmentOutputType = Schema.Schema.Type<typeof EnrichmentOutput>;

export const EnrichTranscript = Operation.make({
  meta: {
    key: DXN.make(`${NAMESPACE}.enrich`),
    name: 'Enrich Transcript',
    description: 'Correct Whisper output and surface entity references and candidates over a sliding window.',
    icon: 'ph--microphone--regular',
  },
  input: EnrichmentInput,
  output: EnrichmentOutput,
});

/**
 * Deterministic stub: echoes the input text as `corrected`, links every block whose text contains
 * a `knownEntities[i].name` substring to that entity's id, and surfaces every capitalised word
 * not already linked as a `proper-noun` candidate. Sentence-end punctuation is added if missing.
 */
const enrichHandler: Operation.WithHandler<typeof EnrichTranscript> = EnrichTranscript.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ window, knownEntities }) {
      const known = knownEntities ?? [];
      const blocks = window.map((entry, index) => {
        const corrected = ensureTerminalPunctuation(entry.text);
        const referenceIds: string[] = [];
        const covered: Array<{ start: number; end: number }> = [];
        for (const entity of known) {
          const haystack = corrected.toLowerCase();
          const needle = entity.name.toLowerCase();
          const idx = haystack.indexOf(needle);
          if (idx >= 0) {
            referenceIds.push(entity.id);
            covered.push({ start: idx, end: idx + entity.name.length });
          }
        }

        const candidates = [...findCapitalisedWords(corrected)].filter(
          ({ start, end }) => !covered.some((c) => c.start <= start && end <= c.end),
        );

        return { index, corrected, referenceIds, candidates };
      });
      return { blocks };
    }),
  ),
);

//
// Pass B — summary (end-of-utterance + periodic).
//

export const SummaryInput = Schema.Struct({
  /** The cumulative summary as of the last invocation (empty string on first call). */
  previousSummary: Schema.String,
  /** New corrected utterances appended since the previous summary. */
  newUtterances: Schema.Array(
    Schema.Struct({
      speaker: Schema.String,
      text: Schema.String,
    }),
  ),
  /** Map of speaker label → human-readable display name. Drives "I" resolution. */
  speakerNames: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  /** IDs and surface forms of references emitted by recent Pass A invocations. */
  recentReferences: Schema.optional(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
      }),
    ),
  ),
});
export type SummaryInputType = Schema.Schema.Type<typeof SummaryInput>;

export const ResolvedReferent = Schema.Struct({
  surface: Schema.String.annotations({ description: 'The deictic / anaphoric form, e.g. "I", "there".' }),
  referent: Schema.String.annotations({ description: 'Canonical name or description the surface resolves to.' }),
  refId: Schema.optional(Schema.String).annotations({
    description: 'ECHO object id when the referent maps to a known entity.',
  }),
});

export const SummaryOutput = Schema.Struct({
  summary: Schema.String,
  resolvedReferents: Schema.Array(ResolvedReferent),
});
export type SummaryOutputType = Schema.Schema.Type<typeof SummaryOutput>;

export const SummarizeConversation = Operation.make({
  meta: {
    key: DXN.make(`${NAMESPACE}.summarize`),
    name: 'Summarize Conversation',
    description: 'Maintain a cumulative summary with referent resolution over a transcript stream.',
    icon: 'ph--text-align-left--regular',
  },
  input: SummaryInput,
  output: SummaryOutput,
});

/**
 * Deterministic stub: appends each new utterance to the previous summary on its own line,
 * prefixed with the speaker's display name (resolving the speaker label via `speakerNames`).
 * If any utterance contains "I" as a standalone word, emits a `resolvedReferents` entry binding
 * it to the speaker's display name — this is the minimal demonstration of the Pass-C contract.
 */
const summarizeHandler: Operation.WithHandler<typeof SummarizeConversation> = SummarizeConversation.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ previousSummary, newUtterances, speakerNames, recentReferences }) {
      const names = speakerNames ?? {};
      const lines = newUtterances.map((u) => `${names[u.speaker] ?? u.speaker}: ${u.text}`);
      const summary = [previousSummary.trim(), ...lines].filter(Boolean).join('\n');

      const resolvedReferents = newUtterances
        .filter((u) => /\bI\b/.test(u.text))
        .map((u) => {
          const displayName = names[u.speaker] ?? u.speaker;
          const ref = (recentReferences ?? []).find((r) => r.name === displayName);
          return { surface: 'I', referent: displayName, refId: ref?.id };
        });

      return { summary, resolvedReferents };
    }),
  ),
);

//
// Exports.
//

export const EnrichmentHandlers = [enrichHandler, summarizeHandler];

//
// Helpers.
//

const ensureTerminalPunctuation = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

function* findCapitalisedWords(
  text: string,
): Generator<{ text: string; kind: 'proper-noun'; start: number; end: number }> {
  const re = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    // Skip pure sentence-initial single words ("Yes", "I", "But", "They") to keep candidates focused on
    // proper nouns. Heuristic for the stub: drop common stop-words.
    const word = match[0];
    if (STOP_WORDS.has(word)) {
      continue;
    }
    yield { text: word, kind: 'proper-noun', start: match.index, end: match.index + word.length };
  }
}

const STOP_WORDS = new Set([
  'I',
  'Yes',
  'No',
  'But',
  'And',
  'Or',
  'So',
  'They',
  'We',
  'He',
  'She',
  'It',
  'The',
  'A',
  'An',
  'Is',
  'Are',
  'Was',
  'Were',
  'Be',
  'Been',
]);
