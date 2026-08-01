//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

import { parseJsonObject } from '../llm';
import { type SenderClass, type SenderResult } from '../pipelines/classify-sender';
import { type TagResult } from '../pipelines/tags';
import { type Judge, gradeCoverage, gradeFaithfulness } from './judge';

// Task-specific accuracy graders for the model-ladder experiment. Labeling is scored deterministically
// against the reference model (haiku) — no LLM judge, so it's cheap and unbiased. Summaries reuse the
// coverage/faithfulness judge. Drafts get a rubric from the opus grader. Every score is 0..1 so tasks
// are comparable in the report.

//
// Labeling — agreement with the reference model (haiku is the bar).
//

export type SpamAgreement = {
  /** Fraction of messages where the model's spam flag matches the reference. */
  readonly accuracy: number;
  /** F1 treating the reference's spam=true as the positive class. */
  readonly f1: number;
};

/** Spam-flag agreement of a model's labels against the reference model's, item-aligned. */
export const spamAgreement = (model: readonly TagResult[], reference: readonly TagResult[]): SpamAgreement => {
  const count = Math.min(model.length, reference.length);
  let truePos = 0;
  let falsePos = 0;
  let falseNeg = 0;
  let agree = 0;
  for (let index = 0; index < count; index++) {
    const predicted = model[index].spam;
    const actual = reference[index].spam;
    if (predicted === actual) {
      agree++;
    }
    if (actual && predicted) {
      truePos++;
    } else if (!actual && predicted) {
      falsePos++;
    } else if (actual && !predicted) {
      falseNeg++;
    }
  }
  const precision = truePos + falsePos > 0 ? truePos / (truePos + falsePos) : 1;
  const recall = truePos + falseNeg > 0 ? truePos / (truePos + falseNeg) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { accuracy: count ? agree / count : 0, f1 };
};

/** Mean Jaccard overlap of the topic-tag sets (excluding `spam`, scored separately) vs the reference. */
export const tagJaccard = (model: readonly TagResult[], reference: readonly TagResult[]): number => {
  const count = Math.min(model.length, reference.length);
  if (count === 0) {
    return 0;
  }
  const topics = (result: TagResult): Set<string> => new Set(result.tags.filter((tag) => tag !== 'spam'));
  let total = 0;
  for (let index = 0; index < count; index++) {
    const left = topics(model[index]);
    const right = topics(reference[index]);
    if (left.size === 0 && right.size === 0) {
      total += 1;
      continue;
    }
    const intersection = [...left].filter((tag) => right.has(tag)).length;
    const union = new Set([...left, ...right]).size;
    total += union > 0 ? intersection / union : 0;
  }
  return Math.round((total / count) * 1000) / 1000;
};

//
// Sender classification — scored against a human-reviewed ground-truth gold set (person/org).
//

export type SenderScore = {
  /** Senders in the gold set that this arm also predicted. */
  readonly scored: number;
  /** Fraction correct over the scored senders. */
  readonly accuracy: number;
  /** Unweighted mean of the person + org F1 (fair under class imbalance). */
  readonly macroF1: number;
  readonly personF1: number;
  readonly orgF1: number;
  /** Confusion counts (gold → predicted), for auditing which direction the errors run. */
  readonly confusion: {
    readonly personAsPerson: number;
    readonly personAsOrg: number;
    readonly orgAsOrg: number;
    readonly orgAsPerson: number;
  };
};

const f1For = (truePos: number, falsePos: number, falseNeg: number): number => {
  const precision = truePos + falsePos > 0 ? truePos / (truePos + falsePos) : 0;
  const recall = truePos + falseNeg > 0 ? truePos / (truePos + falseNeg) : 0;
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
};

/**
 * Scores predicted sender classes against the ground-truth gold set. Only senders present in `gold`
 * are scored; the rest are ignored (the gold set may cover a subset). Reports accuracy plus per-class
 * and macro F1 so class imbalance (org mail typically dominates) doesn't flatter a majority-class
 * guesser, and a confusion breakdown so we can see whether errors sink real people or waste budget on
 * bulk mail.
 */
export const scoreSenders = (
  predictions: readonly SenderResult[],
  gold: ReadonlyMap<string, SenderClass>,
): SenderScore => {
  const confusion = { personAsPerson: 0, personAsOrg: 0, orgAsOrg: 0, orgAsPerson: 0 };
  let scored = 0;
  let correct = 0;
  for (const prediction of predictions) {
    const actual = gold.get(prediction.email.toLowerCase());
    if (!actual) {
      continue;
    }
    scored++;
    if (prediction.class === actual) {
      correct++;
    }
    if (actual === 'person') {
      prediction.class === 'person' ? confusion.personAsPerson++ : confusion.personAsOrg++;
    } else {
      prediction.class === 'org' ? confusion.orgAsOrg++ : confusion.orgAsPerson++;
    }
  }
  const personF1 = f1For(confusion.personAsPerson, confusion.orgAsPerson, confusion.personAsOrg);
  const orgF1 = f1For(confusion.orgAsOrg, confusion.personAsOrg, confusion.orgAsPerson);
  const round3 = (value: number): number => Math.round(value * 1000) / 1000;
  return {
    scored,
    accuracy: scored ? round3(correct / scored) : 0,
    macroF1: round3((personF1 + orgF1) / 2),
    personF1: round3(personF1),
    orgF1: round3(orgF1),
    confusion,
  };
};

//
// Summaries — coverage + faithfulness (opus grader). Gold points are the message's own key points.
//

export type SummaryScore = {
  readonly coverage: number;
  readonly faithfulness: number;
};

/** Grades one summary against its source: coverage of the gold points + faithfulness to the source text. */
export const gradeSummary = async (
  source: string,
  summary: string,
  goldPoints: readonly string[],
  judge: Judge,
): Promise<SummaryScore> => {
  const coverage = await gradeCoverage(goldPoints, summary, judge);
  const faith = await gradeFaithfulness(source, summary, judge);
  return {
    coverage: coverage.total ? Math.round((coverage.covered / coverage.total) * 1000) / 1000 : 0,
    faithfulness: faith.claims ? Math.round((faith.supported / faith.claims) * 1000) / 1000 : 0,
  };
};

//
// Drafts — a 0..1 rubric from the opus grader.
//

export type DraftScore = {
  /** Addresses the sender's questions/requests. */
  readonly relevance: number;
  /** Nothing invented — every claim supported by the original. */
  readonly correctness: number;
  /** Covers everything that needed a response. */
  readonly completeness: number;
  /** Professional, appropriately concise. */
  readonly tone: number;
  /** Mean of the four (0..1). */
  readonly overall: number;
};

const RUBRIC_MAX = 5;

/** Scores a draft reply against the original message on a 0–5 rubric, normalized to 0..1. */
export const gradeDraft = async (original: string, draft: string, judge: Judge): Promise<DraftScore> => {
  if (draft.trim().length === 0) {
    return { relevance: 0, correctness: 0, completeness: 0, tone: 0, overall: 0 };
  }
  const raw = await judge.ask(
    trim`
      Score the DRAFT reply to the ORIGINAL email on each axis from 0 to ${RUBRIC_MAX}:
      - relevance: addresses the questions/requests the sender actually made.
      - correctness: invents nothing — every claim is supported by the original.
      - completeness: responds to everything that needed a response.
      - tone: professional and appropriately concise.
      Return ONLY JSON {"relevance":n,"correctness":n,"completeness":n,"tone":n}.

      ORIGINAL:
      ${original}

      DRAFT:
      ${draft}
    `,
  );
  const parsed = parseJsonObject<Record<string, unknown>>(raw, {});
  const axis = (key: string): number => {
    const value = Number(parsed[key]);
    return Number.isFinite(value) ? Math.max(0, Math.min(RUBRIC_MAX, value)) / RUBRIC_MAX : 0;
  };
  const relevance = axis('relevance');
  const correctness = axis('correctness');
  const completeness = axis('completeness');
  const tone = axis('tone');
  const overall = Math.round(((relevance + correctness + completeness + tone) / 4) * 1000) / 1000;
  return { relevance, correctness, completeness, tone, overall };
};
