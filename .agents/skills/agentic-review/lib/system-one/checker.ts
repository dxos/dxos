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

import { git } from '../git.ts';
import { CONTEXT_KINDS, type ContextKind, type Rule } from '../mdl.ts';
import {
  CHARS_PER_TOKEN,
  charsForTokens,
  estimateTokens,
  packQuestions,
  STATE_PLUS_QUESTION_BUDGET,
} from './budget.ts';
import { type Answer, type Client, type EvaluateResponse, type Question, errorMessage } from './client.ts';
import { fetchContext } from './fetchers.ts';
import { contextQuestion, locationQuestion, verdictQuestion, type QuestionInstructions } from './questions.ts';
import { numberLines, segmentLines, windowLines } from './source.ts';

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

/** True when `value` is one of `CONTEXT_KINDS`'s own keys, narrowing `Object.keys(...)`. */
const isContextKind = (value: string): value is ContextKind => value in CONTEXT_KINDS;

/**
 * True when a caught value carries a truthy `fatal` flag: an account failure (bad key, no
 * credits) that fails every request alike, so the run stops rather than routing it onward.
 */
const isFatal = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'fatal' in error && typeof error.fatal === 'boolean' && error.fatal;

/** One choice a location question offers: a file segment, or (for a `pr` rule) a changed file. */
export type LocationOption = { id: string; label: string; start?: number; end?: number; file?: string };

export type FileState = {
  file: { path: string; lines: string; source: string };
  context?: Partial<Record<ContextKind, string>>;
};

export type PrState = {
  changes: { base: string; files: Record<string, string> };
  context?: Partial<Record<ContextKind, string>>;
};

export type SystemOneState = FileState | PrState;

/** One state built for review, and the location options it offers. */
type BuiltState = {
  state: SystemOneState;
  segments: LocationOption[];
  kinds: ContextKind[];
  /** Set only for a `pr` state: the files it carries diffs for. */
  files?: string[];
};

/** Build the states for one file and one set of context kinds, windowing the file if needed. */
const buildFileStates = ({
  root,
  file,
  base,
  kinds,
}: {
  root: string;
  file: string;
  base: string | null;
  kinds: ContextKind[];
}): BuiltState[] => {
  const text = readFileSync(join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);
  const perKind = Math.min(MAX_CONTEXT_TOKENS, Math.floor((STATE_BUDGET * CONTEXT_SHARE) / Math.max(1, kinds.length)));
  const context: Partial<Record<ContextKind, string>> = {};
  for (const kind of kinds) {
    const fetched = fetchContext(kind, { root, file, base, maxChars: charsForTokens(perKind) });
    context[kind] = fetched ?? '(not available)';
  }
  const sourceBudget = charsForTokens(STATE_BUDGET - estimateTokens(context)) - 200;
  const windows = windowLines(lines, Math.max(2_000, sourceBudget));
  return windows.map((window): BuiltState => {
    const end = window.start + window.lines.length - 1;
    const state: FileState = {
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

/** Smallest cut of one file's diff worth sending; below it a diff says nothing. */
const MIN_DIFF_CHARS = 1_500;

/**
 * Build the states for a `pr` rule: the matched files' diffs, plus any declared context. A change
 * set too large for one state is split across several, each located by choosing among its own
 * files; the rule's verdict is the strongest of them.
 */
const buildPrStates = ({
  root,
  files,
  base,
  kinds,
}: {
  root: string;
  files: string[];
  base: string | null;
  kinds: ContextKind[];
}): BuiltState[] => {
  const extra = kinds.filter((kind) => kind !== 'diff');
  const context: Partial<Record<ContextKind, string>> = {};
  const perKind = extra.length ? Math.min(MAX_CONTEXT_TOKENS, Math.floor((STATE_BUDGET * 0.2) / extra.length)) : 0;
  for (const kind of extra) {
    // Package-level kinds describe the first matched file's package; a change set usually has one.
    context[kind] =
      fetchContext(kind, { root, file: files[0], base, maxChars: charsForTokens(perKind) }) ?? '(not available)';
  }
  const diffBudget = charsForTokens(STATE_BUDGET - estimateTokens(context)) - 500;
  const perState = Math.max(1, Math.floor(diffBudget / MIN_DIFF_CHARS));
  const states: BuiltState[] = [];
  for (let start = 0; start < files.length; start += perState) {
    const slice = files.slice(start, start + perState);
    const perFile = Math.floor(diffBudget / slice.length);
    const diffs: Record<string, string> = Object.fromEntries(
      slice.map((file) => [file, fetchContext('diff', { root, file, base, maxChars: perFile }) ?? '(not available)']),
    );
    const state: PrState = { changes: { base: base ?? '(none)', files: diffs } };
    if (extra.length > 0) {
      state.context = context;
    }
    const segments: LocationOption[] = slice.map((file, index) => ({ id: `f${index + 1}`, file, label: file }));
    states.push({ state, segments, kinds, files: slice });
  }
  return states;
};

const questionId = (index: number, suffix: string): string => `r${index}_${suffix}`;

/** Which questions to ask of one state's rules. */
export type Ask = { verdict: boolean; where: boolean; need: boolean };

export type FileTarget = { file: string; rules: Rule[]; extraKind?: ContextKind; ask?: Ask };
export type PrTarget = { rule: Rule; files: string[]; extraKind?: ContextKind; ask?: Ask };

/** Which file (or pr change set) a request's state was built for. */
export type RequestTarget =
  | { unit: 'file'; file: string; files?: undefined }
  | { unit: 'pr'; files: string[]; file?: undefined };

export type QuestionEntry = {
  id: string;
  question: Question<QuestionInstructions>;
  rule: Rule;
  kind: 'verdict' | 'where' | 'need';
};

/** One planned call to System One: a state, the questions asked of it, and what it is about. */
export type Request = {
  state: SystemOneState;
  segments: LocationOption[];
  target: RequestTarget;
  entries: QuestionEntry[];
  estimatedTokens: number;
};

/** A rule whose question could not fit its state even alone, and the file it was asked of. */
export type Oversized = { ruleId: string; file: string };

type StatePlan = { requests: Request[]; oversized: string[] };

/** Plan the requests for one state and the rules asked of it. */
const planState = ({
  built,
  rules,
  ask,
  target,
}: {
  built: BuiltState;
  rules: Rule[];
  ask: Ask;
  target: RequestTarget;
}): StatePlan => {
  const entries: QuestionEntry[] = [];
  const options: Record<string, string> = Object.fromEntries(
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
    oversized: [
      ...new Set(
        oversized.map((id) => {
          const entry = entries.find((candidate) => candidate.id === id);
          if (!entry) {
            throw new Error(`packQuestions returned an id no entry carries: ${id}`);
          }
          return entry.rule.id;
        }),
      ),
    ],
  };
};

/** Group rules by the exact set of context kinds they declare, so each state carries only that. */
const byContext = (rules: Rule[], extraKind?: ContextKind): { kinds: ContextKind[]; rules: Rule[] }[] => {
  const groups = new Map<string, { kinds: ContextKind[]; rules: Rule[] }>();
  for (const rule of rules) {
    const kinds = [...new Set([...rule.context, ...(extraKind ? [extraKind] : [])])].sort();
    const key = kinds.join(',');
    const group = groups.get(key) ?? { kinds, rules: [] };
    group.rules.push(rule);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** One round's plan: the requests to send, and rules whose question was too large to ask. */
export type Plan = { requests: Request[]; oversized: Oversized[] };

/**
 * Plan one round. Each target says which questions to ask and may add one context kind.
 */
export const planRound = ({
  root,
  base,
  fileTargets,
  prTargets,
}: {
  root: string;
  base: string | null;
  fileTargets: (FileTarget & { ask: Ask })[];
  prTargets: (PrTarget & { ask: Ask })[];
}): Plan => {
  const requests: Request[] = [];
  const oversized: Oversized[] = [];
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
    for (const built of buildPrStates({ root, files, base, kinds })) {
      const builtFiles = built.files ?? [];
      const planned = planState({ built, rules: [rule], ask, target: { unit: 'pr', files: builtFiles } });
      requests.push(...planned.requests);
      oversized.push(...planned.oversized.map((ruleId) => ({ ruleId, file: builtFiles[0] })));
    }
  }
  return { requests, oversized };
};

/** A verdict before its subject file(s) are attached; `readAnswers` fills those in. */
type DraftVerdict = {
  rule: Rule;
  round: 1 | 2;
  kinds: ContextKind[];
  probability?: number;
  where?: LocationOption & { confidence: number };
  need?: { kind: 'none' | ContextKind; probability: number };
};

/** One rule's judgment of one file (or `pr` change set). */
export type Verdict = DraftVerdict & { file: string; files?: string[]; firstProbability?: number };

/** Read one answered request into per-(rule, file) verdicts. */
const readAnswers = (request: Request, answers: Partial<Record<string, Answer>>, round: 1 | 2): Verdict[] => {
  const byRule = new Map<Rule, DraftVerdict>();
  for (const entry of request.entries) {
    const answer = answers[entry.id];
    if (!answer && entry.kind !== 'verdict') {
      continue;
    }
    const verdict: DraftVerdict = byRule.get(entry.rule) ?? {
      rule: entry.rule,
      round,
      kinds: request.state.context ? Object.keys(request.state.context).filter(isContextKind) : [],
    };
    if (entry.kind === 'verdict' && answer && answer.type === 'noul') {
      verdict.probability = answer.noul;
    } else if (entry.kind === 'where' && answer && answer.type === 'choice') {
      const segment = request.segments.find((candidate) => candidate.id === answer.choice);
      verdict.where = segment ? { ...segment, confidence: answer.confidence } : undefined;
    } else if (entry.kind === 'need' && answer && answer.type === 'choice') {
      const kind = answer.choice === 'none' || isContextKind(answer.choice) ? answer.choice : 'none';
      verdict.need = { kind, probability: answer.probabilities?.[answer.choice] ?? answer.confidence };
    }
    byRule.set(entry.rule, verdict);
  }
  if (request.segments.length === 1) {
    for (const verdict of byRule.values()) {
      verdict.where ??= { ...request.segments[0], confidence: 1 };
    }
  }
  return [...byRule.values()].map((verdict): Verdict => {
    const file = request.target.unit === 'pr' ? (verdict.where?.file ?? request.target.files[0]) : request.target.file;
    return { ...verdict, file, files: request.target.files };
  });
};

const verdictKey = (verdict: { rule: Rule; file: string }): string =>
  `${verdict.rule.id}\u0000${verdict.rule.unit === 'pr' ? '*' : verdict.file}`;

/**
 * Keep the strongest verdict per (rule, file): a violation in any window is a violation, and its
 * location comes from the window that answered it.
 */
const mergeVerdicts = (verdicts: Verdict[]): Map<string, Verdict> => {
  const merged = new Map<string, Verdict>();
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
const mergeLocations = (verdicts: Verdict[]): Map<string, LocationOption & { confidence: number }> => {
  const merged = new Map<string, LocationOption & { confidence: number }>();
  for (const verdict of verdicts) {
    const key = verdictKey(verdict);
    const previous = merged.get(key);
    if (verdict.where && (!previous || verdict.where.confidence > previous.confidence)) {
      merged.set(key, verdict.where);
    }
  }
  return merged;
};

export type Settings = {
  threshold: number;
  uncertain: number;
  lift?: number;
  minSample?: number;
  need: number;
  /** `rounds: 1` skips the context re-ask; locations are still asked. */
  rounds: number;
};

export type Stats = {
  requests: number;
  estimatedTokens: number;
  inputTokens: number;
  estimatedForAnswered: number;
  contextRetries: number;
  failedRequests: number;
  failures: string[];
};

export type ReviewStats = Stats & { costUsd: number; charsPerTokenMeasured: number | null };

export type ReviewResult = { verdicts: Verdict[]; oversized: Oversized[]; stats: ReviewStats };

export type RunReviewOptions = {
  /** Null plans without calling the API. */
  client: Client | null;
  root: string;
  base: string | null;
  fileTargets: FileTarget[];
  prTargets: PrTarget[];
  settings: Settings;
  log?: (message: string) => void;
};

/**
 * Run the review in two rounds: verdicts and context requests first, then context re-asks for
 * uncertain verdicts and locations for everything worth reporting.
 */
export const runReview = async ({
  client,
  root,
  base,
  fileTargets,
  prTargets,
  settings,
  log = () => {},
}: RunReviewOptions): Promise<ReviewResult> => {
  const stats: Stats = {
    requests: 0,
    estimatedTokens: 0,
    inputTokens: 0,
    estimatedForAnswered: 0,
    contextRetries: 0,
    failedRequests: 0,
    failures: [],
  };
  const oversized: Oversized[] = [];

  const execute = async (plan: Plan, round: 1 | 2): Promise<Verdict[]> => {
    stats.requests += plan.requests.length;
    stats.estimatedTokens += plan.requests.reduce((sum, request) => sum + request.estimatedTokens, 0);
    oversized.push(...plan.oversized);
    if (!client) {
      return [];
    }
    let done = 0;
    const results = await Promise.all(
      plan.requests.map(async (request): Promise<Verdict[]> => {
        const questions: Record<string, Question<QuestionInstructions>> = Object.fromEntries(
          request.entries.map((entry) => [entry.id, entry.question]),
        );
        let response: EvaluateResponse;
        try {
          response = await client.evaluate(request.state, questions);
        } catch (error) {
          // An account failure (key, credits) fails every request alike, so the run stops; any other
          // failure costs only this request's pairs, which are routed onward as unanswered.
          if (isFatal(error)) {
            throw error;
          }
          stats.failedRequests++;
          const message = errorMessage(error);
          stats.failures.push(message);
          log(`request failed, its ${request.entries.length} questions are unanswered: ${message}`);
          return readAnswers(request, {}, round);
        }
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

  const firstAsk: Ask = { verdict: true, where: false, need: settings.rounds > 1 };
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
  const followFiles = new Map<string, FileTarget & { ask: Ask }>();
  const followPr: (PrTarget & { ask: Ask })[] = [];
  for (const verdict of first.values()) {
    const status = classify(verdict, settings, bounds);
    if (status !== 'violation' && status !== 'uncertain') {
      continue;
    }
    let wanted = false;
    let extraKind: ContextKind | undefined;
    const need = verdict.need;
    if (
      settings.rounds > 1 &&
      status === 'uncertain' &&
      need &&
      need.kind !== 'none' &&
      need.probability >= settings.need
    ) {
      wanted = true;
      extraKind = need.kind;
    }
    const ask: Ask = { verdict: wanted, where: true, need: false };
    stats.contextRetries += wanted ? 1 : 0;
    if (verdict.rule.unit === 'pr') {
      followPr.push({ rule: verdict.rule, files: verdict.files ?? [], extraKind, ask });
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
      const updated: Verdict = again
        ? { ...again, need: verdict.need, firstProbability: verdict.probability }
        : { ...verdict };
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

/** The minimal shape `uncertainBounds` and `classify` need from a verdict. */
export type ScoredVerdict = { rule: { id: string }; probability?: number };

export type UncertainBoundsSettings = { uncertain: number; lift?: number; minSample?: number };

/**
 * Per-rule lower bound of the uncertain band: the floor, raised to the rule's median across the
 * run plus `lift` once the rule has enough verdicts for the median to mean something.
 */
export const uncertainBounds = (
  verdicts: ScoredVerdict[],
  { uncertain, lift = 0, minSample = Number.POSITIVE_INFINITY }: UncertainBoundsSettings,
): Map<string, number> => {
  const byRule = new Map<string, number[]>();
  for (const verdict of verdicts) {
    if (verdict.probability !== undefined) {
      byRule.set(verdict.rule.id, [...(byRule.get(verdict.rule.id) ?? []), verdict.probability]);
    }
  }
  return new Map(
    [...byRule].map(([ruleId, scores]) => {
      if (scores.length < minSample) {
        return [ruleId, uncertain] as const;
      }
      const sorted = [...scores].sort((left, right) => left - right);
      const middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
      return [ruleId, Math.max(uncertain, median + lift)] as const;
    }),
  );
};

export type VerdictStatus = 'violation' | 'uncertain' | 'clean' | 'unanswered';

/** Classify a verdict against the reporting threshold and its rule's uncertain bound. */
export const classify = (
  verdict: ScoredVerdict,
  { threshold, uncertain }: { threshold: number; uncertain: number },
  bounds?: Map<string, number>,
): VerdictStatus => {
  if (verdict.probability === undefined) {
    return 'unanswered';
  }
  const bound = bounds?.get(verdict.rule.id) ?? uncertain;
  return verdict.probability >= threshold ? 'violation' : verdict.probability >= bound ? 'uncertain' : 'clean';
};

/** A verdict whose `probability` is known to be set, the precondition for reporting it. */
export type ReportableVerdict = Verdict & { probability: number };

/** True when a verdict carries a probability, the only thing that distinguishes it from `Verdict`. */
export const isReportableVerdict = (verdict: Verdict): verdict is ReportableVerdict =>
  verdict.probability !== undefined;

/** One rule's leftover verdicts: the fragment they append to, and the files still to review. */
export type FollowUpEntry = { nn: string; files: string[] };

/** One agentic follow-up: one rule, at most `size` of its files, pointed at one fragment. */
export type FollowUpBatch = { ruleId: string; nn: string; files: string[] };

/**
 * Regroup the pairs left for an agentic reviewer into batches of one rule over at most `size`
 * files, each pointed at one of that rule's fragments. Finalize merges every fragment and stamps
 * severity by rule, so any fragment of the rule will do.
 */
export const followUpBatches = (byRule: Map<string, FollowUpEntry>, size: number): FollowUpBatch[] =>
  [...byRule].flatMap(([ruleId, { nn, files }]) => {
    const batches: FollowUpBatch[] = [];
    for (let start = 0; start < files.length; start += size) {
      batches.push({ ruleId, nn, files: files.slice(start, start + size) });
    }
    return batches;
  });

/** Line a diagnostic points at: the located segment, or the first changed line of a `pr` file. */
export const diagnosticLine = (
  verdict: { where?: LocationOption; rule: Rule; file: string },
  { base }: { base: string | null },
): number => {
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
export const diagnosticBody = (verdict: ReportableVerdict): string => {
  const where = verdict.where?.start
    ? ` The likeliest place is lines ${verdict.where.start}-${verdict.where.end} (\`${verdict.where.label}\`, location confidence ${verdict.where.confidence.toFixed(2)}).`
    : '';
  const round =
    verdict.round === 2
      ? ` Judged with added \`${verdict.kinds.join(', ')}\` context after a first pass of ${verdict.firstProbability?.toFixed(2)}.`
      : '';
  return `System One judges this a likely violation of \`${verdict.rule.id}\` (${verdict.rule.title}), p=${verdict.probability.toFixed(2)}.${where}${round} This is a single-shot classifier: confirm against the rule before acting.`;
};
