//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText, parseJsonArray, parseJsonObject } from '../llm';
import { ALL_VARIANTS, type ModelVariant, REMOTE_VARIANTS } from '../models';
import { slugify } from './fact-store';

// Blind LLM-judge scorer for the brain-vs-rag ablation. The generator models produce the summaries;
// a single (ideally stronger, remote) judge model grades every arm the same way, so the only variable
// is which retrieval skill fed the generator. Grading is deliberately corpus-grounded — coverage of a
// gold salient-point set (does the arm surface the right things) and faithfulness (does it avoid
// unsupported claims) — plus a blind pairwise vote vs. the database baseline. Facts "help" iff an arm
// beats the baseline on coverage without losing faithfulness.

/** Char budget for the subject corpus handed to the judge (keeps the judge prompt inside context). */
const CORPUS_CHAR_BUDGET = 16_000;

/** Gold-set size the judge is asked to produce. */
const GOLD_POINTS = 12;

/** A judge bound to one model — every grading call routes through the same backend. */
export type Judge = {
  readonly name: string;
  readonly ask: (prompt: string) => Promise<string>;
};

/**
 * Resolves the grading model. `JUDGE` (a name substring) overrides; defaults to a strong remote tier
 * so the judge is more capable than most generators (and, being fixed, is applied identically to
 * every arm). Falls back to any remote variant, then the first known variant.
 */
export const resolveJudge = (name = process.env.JUDGE?.trim() || 'claude-sonnet'): Judge => {
  const variant: ModelVariant =
    ALL_VARIANTS.find((candidate) => candidate.name.includes(name)) ??
    REMOTE_VARIANTS[1] ??
    REMOTE_VARIANTS[0] ??
    ALL_VARIANTS[0];
  const ask = (prompt: string): Promise<string> =>
    EffectEx.runPromise(
      generateText(variant.model, variant.provider, prompt, '120 seconds').pipe(
        Effect.provide(AiServiceTestingPreset(variant.preset)),
      ),
    );
  return { name: variant.name, ask };
};

/** The subject's own messages (fallback: the whole feed), rendered as one grounding corpus for the judge. */
export const subjectCorpus = (subject: string, messages: readonly Message.Message[]): string => {
  const key = slugify(subject);
  const own = messages.filter((message) => message.sender.name && slugify(message.sender.name) === key);
  const selected = own.length ? own : messages;
  let corpus = '';
  for (const message of selected) {
    const from = message.sender.name ?? message.sender.email ?? 'unknown';
    const block = `From: ${from}\n${Message.extractText(message)}`.trim();
    if (corpus.length + block.length + 2 > CORPUS_CHAR_BUDGET) {
      break;
    }
    corpus += `${block}\n\n`;
  }
  return corpus.trim();
};

/**
 * Builds the evaluation key: the salient points any good summary of the subject's messages must
 * mention. Derived once from the raw corpus (model-independent) so every arm is graded against the
 * same ground truth.
 */
export const buildGoldPoints = async (subject: string, corpus: string, judge: Judge): Promise<string[]> => {
  if (corpus.length === 0) {
    return [];
  }
  const raw = await judge.ask(
    trim`
      You are building an evaluation key from the messages below (all involving ${subject}).
      List the ${GOLD_POINTS} most important points a good summary MUST mention.
      Each point: one short, self-contained factual sentence. No preamble, no fluff.
      Return ONLY a JSON array of strings.

      MESSAGES:
      ${corpus}
    `,
  );
  return parseJsonArray<string>(raw)
    .map((point) => String(point).trim())
    .filter(Boolean)
    .slice(0, GOLD_POINTS);
};

/** Coverage grade: which gold points the summary covers (explicitly or by clear paraphrase). */
export const gradeCoverage = async (
  goldPoints: readonly string[],
  summary: string,
  judge: Judge,
): Promise<{ covered: number; total: number }> => {
  const total = goldPoints.length;
  if (total === 0 || summary.trim().length === 0) {
    return { covered: 0, total };
  }
  const numbered = goldPoints.map((point, index) => `${index + 1}. ${point}`).join('\n');
  const raw = await judge.ask(
    trim`
      Grade the SUMMARY against the checklist. For each point, decide whether the summary covers it
      (explicitly or by clear paraphrase). Return ONLY a JSON array of booleans, one per point, in
      order (length ${total}).

      CHECKLIST:
      ${numbered}

      SUMMARY:
      ${summary}
    `,
  );
  const flags = parseJsonArray<unknown>(raw);
  const covered = goldPoints.reduce((count, _point, index) => count + (flags[index] === true ? 1 : 0), 0);
  return { covered, total };
};

/** Faithfulness grade: fraction of the summary's factual claims the source corpus supports. */
export const gradeFaithfulness = async (
  corpus: string,
  summary: string,
  judge: Judge,
): Promise<{ supported: number; claims: number }> => {
  if (corpus.length === 0 || summary.trim().length === 0) {
    return { supported: 0, claims: 0 };
  }
  const raw = await judge.ask(
    trim`
      Check the SUMMARY for hallucinations against the SOURCE. List each distinct factual claim the
      summary makes and whether the source supports it. Return ONLY JSON of the form
      {"claims":[{"claim":"...","supported":true|false}]}.

      SOURCE:
      ${corpus}

      SUMMARY:
      ${summary}
    `,
  );
  const parsed = parseJsonObject<{ claims?: { supported?: unknown }[] }>(raw, {});
  const claims = Array.isArray(parsed.claims) ? parsed.claims : [];
  const supported = claims.reduce((count, claim) => count + (claim?.supported === true ? 1 : 0), 0);
  return { supported, claims: claims.length };
};

/**
 * Blind pairwise vote. The two summaries are presented as A/B with position randomized and arm labels
 * hidden, so the judge cannot prefer an arm by name or slot. Returns which arm won.
 */
export const pairwiseWinner = async (
  subject: string,
  goldPoints: readonly string[],
  baseline: string,
  candidate: string,
  judge: Judge,
): Promise<'baseline' | 'candidate' | 'tie'> => {
  if (baseline.trim().length === 0 && candidate.trim().length === 0) {
    return 'tie';
  }
  // Randomize the slot so neither arm has a positional advantage.
  const candidateIsA = Math.random() < 0.5;
  const textA = candidateIsA ? candidate : baseline;
  const textB = candidateIsA ? baseline : candidate;
  const points = goldPoints.length ? goldPoints.map((point) => `- ${point}`).join('\n') : '(none)';
  const raw = await judge.ask(
    trim`
      Two summaries answer: "summarize messages from ${subject}". Pick the one that better covers the
      key points AND avoids unsupported claims. Return ONLY JSON {"winner":"A"|"B"|"tie"}.

      KEY POINTS:
      ${points}

      SUMMARY A:
      ${textA || '(empty)'}

      SUMMARY B:
      ${textB || '(empty)'}
    `,
  );
  const winner = parseJsonObject<{ winner?: string }>(raw, {}).winner;
  if (winner !== 'A' && winner !== 'B') {
    return 'tie';
  }
  const candidateWon = winner === 'A' ? candidateIsA : !candidateIsA;
  return candidateWon ? 'candidate' : 'baseline';
};
