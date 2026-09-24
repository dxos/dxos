//
// Copyright 2026 DXOS.org
//

// The System One review pass. For each file, the rules that apply are grouped by the context
// they declare, and one state is built per group (split into windows when the file is too
// large). Round one asks every rule two things in the same call: whether the code violates it,
// and which missing context would most change that answer. Round two follows up only where it
// matters: an uncertain verdict whose model asked for context is re-asked with that context
// fetched, since the model cannot explore on its own; and every verdict worth reporting is
// located by choosing a segment, since the model cannot emit a line number.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { git } from '../git.mjs';
import {
  CHARS_PER_TOKEN,
  charsForTokens,
  estimateTokens,
  packQuestions,
  STATE_PLUS_QUESTION_BUDGET,
} from './budget.mjs';
import { fetchContext } from './fetchers.mjs';
import { contextQuestion, locationQuestion, verdictQuestion } from './questions.mjs';
import { numberLines, segmentLines, truncateText, windowLines } from './source.mjs';

/** Published input price, USD per million tokens (output is free). */
export const PRICE_PER_MILLION = 0.042;

/** Tokens held back from the state for the longest question sent beside it. */
const QUESTION_RESERVE = 3_000;

/** Cap on each context kind, so one large fetch cannot crowd out the code under review. */
const MAX_CONTEXT_TOKENS = 4_000;

/** Share of the state budget all context together may take; the rest is for the code. */
const CONTEXT_SHARE = 0.5;

/**
 * Calibrated on the diff hunks the mined rules cite and on a 202-file trial
 * (`.agents/projects/architecture-rules/dataset/CALIBRATION.md`). At 0.8 almost nothing clean is
 * reported. Subjective rules (naming, indirection, docs) score a middling 0.2-0.4 on nearly every
 * file, so a flat lower bound routes most of them onward; a bound relative to each rule's own
 * median across the run routes about a seventh of pairs while keeping about two thirds of real
 * findings, better on both counts than any flat bound.
 */
export const DEFAULTS = {
  /** A verdict at or above this is reported as a violation. */
  threshold: 0.8,
  /** Floor of the uncertain band: under it a verdict is dismissed. */
  uncertain: 0.15,
  /** A verdict must also clear its rule's median across the run by this much to be uncertain. */
  lift: 0.15,
  /** Verdicts a rule needs in a run before its median is trusted; fewer use the floor alone. */
  minSample: 20,
  /** Probability the context answer must give a kind before round two fetches it. */
  need: 0.35,
};

const STATE_BUDGET = STATE_PLUS_QUESTION_BUDGET - QUESTION_RESERVE;

/** Build the states for one file and one set of context kinds, windowing the file if needed. */
const buildFileStates = ({ root, file, base, kinds }) => {
  const text = readFileSync(join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);
  const perKind = Math.min(MAX_CONTEXT_TOKENS, Math.floor((STATE_BUDGET * CONTEXT_SHARE) / Math.max(1, kinds.length)));
  const context = {};
  for (const kind of kinds) {
    const fetched = fetchContext(kind, { root, file, base, maxChars: charsForTokens(perKind) });
    context[kind] = fetched ?? '(not available)';
  }
  const sourceBudget = charsForTokens(STATE_BUDGET - estimateTokens(context)) - 200;
  const windows = windowLines(lines, Math.max(2_000, sourceBudget));
  return windows.map((window) => {
    const end = window.start + window.lines.length - 1;
    const state = {
      file: {
        path: file,
        lines: windows.length > 1 ? `${window.start}-${end} of ${lines.length}` : `1-${lines.length}`,
        source: numberLines(window.lines, window.start),
      },
    };
    if (kinds.length > 0) {
      state.context = context;
    }
    return { state, segments: segmentLines(window.lines, window.start), kinds };
  });
};

/** Build the state for a `pr` rule: every matched file's diff, plus any declared context. */
const buildPrState = ({ root, files, base, kinds }) => {
  const perFile = Math.max(1_500, Math.floor(charsForTokens(STATE_BUDGET * 0.8) / Math.max(1, files.length)));
  const diffs = {};
  for (const file of files) {
    diffs[file] = fetchContext('diff', { root, file, base, maxChars: perFile }) ?? '(not available)';
  }
  const state = { changes: { base: base ?? '(none)', files: diffs } };
  const extra = kinds.filter((kind) => kind !== 'diff');
  if (extra.length > 0) {
    state.context = {};
    const perKind = Math.min(MAX_CONTEXT_TOKENS, Math.floor((STATE_BUDGET * 0.2) / extra.length));
    for (const kind of extra) {
      // Package-level kinds describe the first matched file's package; a change set usually has one.
      state.context[kind] =
        fetchContext(kind, { root, file: files[0], base, maxChars: charsForTokens(perKind) }) ?? '(not available)';
    }
  }
  const segments = files.slice(0, 60).map((file, index) => ({ id: `f${index + 1}`, file, label: file }));
  return { state, segments, kinds };
};

const questionId = (index, suffix) => `r${index}_${suffix}`;

/**
 * Plan the requests for one state and the rules asked of it.
 *
 * @param {{ verdict: boolean, where: boolean, need: boolean }} ask Which questions to ask.
 * @returns {{ requests: Array<object>, oversized: string[] }}
 */
const planState = ({ built, rules, ask, target }) => {
  const entries = [];
  const options = Object.fromEntries(
    built.segments.map((segment) => [
      segment.id,
      segment.file ? segment.file : `lines ${segment.start}-${segment.end}: ${segment.label}`,
    ]),
  );
  rules.forEach((rule, index) => {
    if (ask.verdict) {
      entries.push({ id: questionId(index, 'v'), question: verdictQuestion(rule), rule, kind: 'verdict' });
    }
    if (ask.where && built.segments.length > 1) {
      entries.push({ id: questionId(index, 'w'), question: locationQuestion(rule, options), rule, kind: 'where' });
    }
    const asked = ask.need ? contextQuestion(rule, built.kinds) : null;
    if (asked) {
      entries.push({ id: questionId(index, 'c'), question: asked, rule, kind: 'need' });
    }
  });
  const stateTokens = estimateTokens(built.state);
  const { batches, oversized } = packQuestions(stateTokens, entries);
  return {
    requests: batches.map((batch) => ({
      state: built.state,
      segments: built.segments,
      target,
      entries: batch,
      estimatedTokens: stateTokens + batch.reduce((sum, entry) => sum + estimateTokens(entry.question), 0),
    })),
    oversized: [...new Set(oversized.map((id) => entries.find((entry) => entry.id === id).rule.id))],
  };
};

/** Group rules by the exact set of context kinds they declare, so each state carries only that. */
const byContext = (rules, extraKind) => {
  const groups = new Map();
  for (const rule of rules) {
    const kinds = [...new Set([...rule.context, ...(extraKind ? [extraKind] : [])])].sort();
    const key = kinds.join(',');
    if (!groups.has(key)) {
      groups.set(key, { kinds, rules: [] });
    }
    groups.get(key).rules.push(rule);
  }
  return [...groups.values()];
};

/**
 * Plan one round. Each target says which questions to ask and may add one context kind.
 *
 * @param {object} options
 * @param {string} options.root
 * @param {string|null} options.base Diff base for `diff` and `pr` context.
 * @param {Array<{ file: string, rules: object[], extraKind?: string, ask: object }>} options.fileTargets
 * @param {Array<{ rule: object, files: string[], extraKind?: string, ask: object }>} options.prTargets
 */
export const planRound = ({ root, base, fileTargets, prTargets }) => {
  const requests = [];
  const oversized = [];
  for (const { file, rules, extraKind, ask } of fileTargets) {
    for (const { kinds, rules: grouped } of byContext(rules, extraKind)) {
      for (const built of buildFileStates({ root, file, base, kinds })) {
        const planned = planState({ built, rules: grouped, ask, target: { unit: 'file', file } });
        requests.push(...planned.requests);
        oversized.push(...planned.oversized.map((ruleId) => ({ ruleId, file })));
      }
    }
  }
  for (const { rule, files, extraKind, ask } of prTargets) {
    const kinds = [...new Set([...rule.context, ...(extraKind ? [extraKind] : [])])].sort();
    const built = buildPrState({ root, files, base, kinds });
    const planned = planState({ built, rules: [rule], ask, target: { unit: 'pr', files } });
    requests.push(...planned.requests);
    oversized.push(...planned.oversized.map((ruleId) => ({ ruleId, file: files[0] })));
  }
  return { requests, oversized };
};

/** Read one answered request into per-(rule, file) verdicts. */
const readAnswers = (request, answers, round) => {
  const byRule = new Map();
  for (const entry of request.entries) {
    const answer = answers[entry.id];
    if (!answer) {
      continue;
    }
    const verdict = byRule.get(entry.rule) ?? {
      rule: entry.rule,
      round,
      kinds: request.state.context ? Object.keys(request.state.context) : [],
    };
    if (entry.kind === 'verdict' && answer.type === 'noul') {
      verdict.probability = answer.noul;
    } else if (entry.kind === 'where' && answer.type === 'choice') {
      const segment = request.segments.find((candidate) => candidate.id === answer.choice);
      verdict.where = segment ? { ...segment, confidence: answer.confidence } : undefined;
    } else if (entry.kind === 'need' && answer.type === 'choice') {
      verdict.need = { kind: answer.choice, probability: answer.probabilities?.[answer.choice] ?? answer.confidence };
    }
    byRule.set(entry.rule, verdict);
  }
  if (request.segments.length === 1) {
    for (const verdict of byRule.values()) {
      verdict.where ??= { ...request.segments[0], confidence: 1 };
    }
  }
  return [...byRule.values()].map((verdict) => {
    const file = request.target.unit === 'pr' ? (verdict.where?.file ?? request.target.files[0]) : request.target.file;
    return { ...verdict, file, files: request.target.files };
  });
};

const verdictKey = (verdict) => `${verdict.rule.id}\u0000${verdict.rule.unit === 'pr' ? '*' : verdict.file}`;

/**
 * Keep the strongest verdict per (rule, file): a violation in any window is a violation, and its
 * location comes from the window that answered it.
 */
const mergeVerdicts = (verdicts) => {
  const merged = new Map();
  for (const verdict of verdicts) {
    const key = verdictKey(verdict);
    const previous = merged.get(key);
    if (!previous || (verdict.probability ?? -1) > (previous.probability ?? -1)) {
      merged.set(key, verdict);
    }
  }
  return merged;
};

/** Among location-only answers across windows, keep the most confident one. */
const mergeLocations = (verdicts) => {
  const merged = new Map();
  for (const verdict of verdicts) {
    const key = verdictKey(verdict);
    const previous = merged.get(key);
    if (verdict.where && (!previous || verdict.where.confidence > previous.confidence)) {
      merged.set(key, verdict.where);
    }
  }
  return merged;
};

/**
 * Run the review in two rounds: verdicts and context requests first, then context re-asks for
 * uncertain verdicts and locations for everything worth reporting.
 *
 * @param {object} options
 * @param {{ evaluate: Function }|null} options.client Null plans without calling the API.
 * @param {string} options.root
 * @param {string|null} options.base
 * @param {Array<{ file: string, rules: object[] }>} options.fileTargets
 * @param {Array<{ rule: object, files: string[] }>} options.prTargets
 * @param {{ threshold: number, uncertain: number, need: number, rounds: number }} options.settings
 *   `rounds: 1` skips the context re-ask; locations are still asked.
 * @param {(message: string) => void} [options.log]
 */
export const runReview = async ({ client, root, base, fileTargets, prTargets, settings, log = () => {} }) => {
  const stats = { requests: 0, estimatedTokens: 0, inputTokens: 0, estimatedForAnswered: 0, contextRetries: 0 };
  const oversized = [];

  const execute = async (plan, round) => {
    stats.requests += plan.requests.length;
    stats.estimatedTokens += plan.requests.reduce((sum, request) => sum + request.estimatedTokens, 0);
    oversized.push(...plan.oversized);
    if (!client) {
      return [];
    }
    let done = 0;
    const results = await Promise.all(
      plan.requests.map(async (request) => {
        const questions = Object.fromEntries(request.entries.map((entry) => [entry.id, entry.question]));
        const response = await client.evaluate(request.state, questions);
        stats.inputTokens += response.usage?.input_tokens ?? 0;
        stats.estimatedForAnswered += request.estimatedTokens;
        done++;
        if (done % 25 === 0 || done === plan.requests.length) {
          log(`round ${round}: ${done}/${plan.requests.length} requests answered`);
        }
        return readAnswers(request, response.answers ?? {}, round);
      }),
    );
    return results.flat();
  };

  const firstAsk = { verdict: true, where: false, need: settings.rounds > 1 };
  const first = mergeVerdicts(
    await execute(
      planRound({
        root,
        base,
        fileTargets: fileTargets.map((target) => ({ ...target, ask: firstAsk })),
        prTargets: prTargets.map((target) => ({ ...target, ask: firstAsk })),
      }),
      1,
    ),
  );

  // Round two: re-ask uncertain verdicts with the context their model asked for, and locate the rest.
  // Bounds come from round one's verdicts across the whole run, so subjective rules that score
  // middling everywhere are not re-asked for verdicts they would end up dismissing.
  const bounds = uncertainBounds([...first.values()], settings);
  const followFiles = new Map();
  const followPr = [];
  for (const verdict of first.values()) {
    const status = classify(verdict, settings, bounds);
    if (status !== 'violation' && status !== 'uncertain') {
      continue;
    }
    const wanted =
      settings.rounds > 1 &&
      status === 'uncertain' &&
      verdict.need &&
      verdict.need.kind !== 'none' &&
      verdict.need.probability >= settings.need;
    const extraKind = wanted ? verdict.need.kind : undefined;
    const ask = { verdict: Boolean(wanted), where: true, need: false };
    stats.contextRetries += wanted ? 1 : 0;
    if (verdict.rule.unit === 'pr') {
      followPr.push({ rule: verdict.rule, files: verdict.files, extraKind, ask });
    } else {
      const key = `${verdict.file}\u0000${extraKind ?? ''}`;
      const target = followFiles.get(key) ?? { file: verdict.file, rules: [], extraKind, ask };
      target.rules.push(verdict.rule);
      followFiles.set(key, target);
    }
  }
  if (client && (followFiles.size > 0 || followPr.length > 0)) {
    const second = await execute(
      planRound({ root, base, fileTargets: [...followFiles.values()], prTargets: followPr }),
      2,
    );
    const reasked = mergeVerdicts(second.filter((verdict) => verdict.probability !== undefined));
    const located = mergeLocations(second);
    for (const [key, verdict] of first) {
      const again = reasked.get(key);
      const updated = again ? { ...again, need: verdict.need, firstProbability: verdict.probability } : { ...verdict };
      updated.where = located.get(key) ?? updated.where;
      first.set(key, updated);
    }
  }

  return {
    verdicts: [...first.values()],
    oversized,
    stats: {
      ...stats,
      costUsd: (stats.inputTokens / 1_000_000) * PRICE_PER_MILLION,
      charsPerTokenMeasured:
        stats.inputTokens > 0 ? (stats.estimatedForAnswered * CHARS_PER_TOKEN) / stats.inputTokens : null,
    },
  };
};

/**
 * Per-rule lower bound of the uncertain band: the floor, raised to the rule's median across the
 * run plus `lift` once the rule has enough verdicts for the median to mean something.
 *
 * @param {Array<{ rule: { id: string }, probability?: number }>} verdicts
 * @returns {Map<string, number>} Rule id → bound.
 */
export const uncertainBounds = (verdicts, { uncertain, lift = 0, minSample = Number.POSITIVE_INFINITY }) => {
  const byRule = new Map();
  for (const verdict of verdicts) {
    if (verdict.probability !== undefined) {
      byRule.set(verdict.rule.id, [...(byRule.get(verdict.rule.id) ?? []), verdict.probability]);
    }
  }
  return new Map(
    [...byRule].map(([ruleId, scores]) => {
      if (scores.length < minSample) {
        return [ruleId, uncertain];
      }
      const sorted = [...scores].sort((left, right) => left - right);
      const middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
      return [ruleId, Math.max(uncertain, median + lift)];
    }),
  );
};

/** Classify a verdict against the reporting threshold and its rule's uncertain bound. */
export const classify = (verdict, { threshold, uncertain }, bounds) => {
  if (verdict.probability === undefined) {
    return 'unanswered';
  }
  const bound = bounds?.get(verdict.rule.id) ?? uncertain;
  return verdict.probability >= threshold ? 'violation' : verdict.probability >= bound ? 'uncertain' : 'clean';
};

/** Line a diagnostic points at: the located segment, or the first changed line of a `pr` file. */
export const diagnosticLine = (verdict, { base }) => {
  if (verdict.where?.start) {
    return verdict.where.start;
  }
  if (verdict.rule.unit === 'pr' && base) {
    const hunk = (git(['diff', '-U0', base, '--', verdict.file], { allowFail: true }) ?? '').match(/^@@ [^+]*\+(\d+)/m);
    return hunk ? Number(hunk[1]) : 1;
  }
  return 1;
};

/** Diagnostic body for a reported violation. */
export const diagnosticBody = (verdict) => {
  const where = verdict.where?.start
    ? ` The likeliest place is lines ${verdict.where.start}-${verdict.where.end} (\`${verdict.where.label}\`, location confidence ${verdict.where.confidence.toFixed(2)}).`
    : '';
  const round =
    verdict.round === 2
      ? ` Judged with added \`${verdict.kinds.join(', ')}\` context after a first pass of ${verdict.firstProbability?.toFixed(2)}.`
      : '';
  return `System One judges this a likely violation of \`${verdict.rule.id}\` (${verdict.rule.title}), p=${verdict.probability.toFixed(2)}.${where}${round} This is a single-shot classifier: confirm against the rule before acting.`;
};
