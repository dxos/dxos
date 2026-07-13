//
// Copyright 2026 DXOS.org
//

import { type TopicDraft } from '@dxos/pipeline-email';
import { Outline } from '@dxos/plugin-outliner';

// Active Topics experiment (spec 2026-07-13): score clustered topics for how "active" they are, split
// high-confidence active topics from lower-confidence suggestions, and assemble the fully-populated
// structure for the active ones. The scoring + assembly + rendering are PURE (unit-tested here); the
// LLM populate stage (status / facts / drafts / task extraction) is wired separately in the driver.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic per-cluster activity signals (derived from the cluster's threads). */
export type ClusterSignals = {
  /** Most recent member-message timestamp (ms). */
  readonly latestCreatedMs: number;
  /** Any member thread is awaiting the owner's reply. */
  readonly awaitingMine: boolean;
  /** A participant is a known person (contact / classify-sender = person). */
  readonly personLinked: boolean;
  /** Rolled-up open questions + action items across the cluster. */
  readonly openItemCount: number;
};

export type ActivityOptions = {
  /** Wall-clock now (ms) — injected (no `Date.now()` in pure code). */
  readonly nowMs: number;
  /** Recency half-life (ms); a cluster last active one half-life ago scores 0.5 on recency. */
  readonly halfLifeMs?: number;
  /** Open-item count that saturates the open-items signal. */
  readonly maxOpenItems?: number;
  /** Signal weights (normalized internally; need not sum to 1). */
  readonly weights?: Partial<Record<'recency' | 'awaiting' | 'person' | 'items', number>>;
};

const DEFAULT_WEIGHTS = { recency: 0.35, awaiting: 0.25, person: 0.25, items: 0.15 } as const;

/**
 * Deterministic activity score in `[0, 1]`: a weighted blend of recency (exponential decay),
 * awaiting-mine thread state, person-linkage, and open-item volume. Pure.
 */
export const activityScore = (signals: ClusterSignals, options: ActivityOptions): number => {
  const halfLifeMs = options.halfLifeMs ?? 14 * DAY_MS;
  const maxOpenItems = options.maxOpenItems ?? 5;
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };

  const ageMs = Math.max(0, options.nowMs - signals.latestCreatedMs);
  const recency = 2 ** (-ageMs / halfLifeMs);
  const items = maxOpenItems > 0 ? Math.min(signals.openItemCount / maxOpenItems, 1) : 0;

  const parts = {
    recency,
    awaiting: signals.awaitingMine ? 1 : 0,
    person: signals.personLinked ? 1 : 0,
    items,
  };
  const totalWeight = weights.recency + weights.awaiting + weights.person + weights.items;
  if (totalWeight <= 0) {
    return 0;
  }
  const weighted =
    weights.recency * parts.recency +
    weights.awaiting * parts.awaiting +
    weights.person * parts.person +
    weights.items * parts.items;
  return weighted / totalWeight;
};

/** Blends the LLM confidence with the deterministic activity score (`w` weights the LLM). */
export const combineConfidence = (activity: number, llm: number, w = 0.6): number =>
  Math.min(1, Math.max(0, w * llm + (1 - w) * activity));

/** A scored candidate before the active/suggested split. */
export type ScoredCandidate = {
  readonly draft: TopicDraft;
  readonly confidence: number;
  readonly rationale: string;
};

export type SplitOptions = {
  /** Minimum confidence to be `active`. */
  readonly threshold?: number;
  /** Maximum number of `active` topics (the highest-confidence ones); the rest become `suggested`. */
  readonly top?: number;
};

/**
 * Splits scored candidates into `active` (confidence ≥ threshold, capped at `top`, highest first) and
 * `suggested` (everything else). Stable: ties keep input order. Pure.
 */
export const classifyTopics = (
  candidates: readonly ScoredCandidate[],
  options: SplitOptions = {},
): { active: ScoredCandidate[]; suggested: ScoredCandidate[] } => {
  const threshold = options.threshold ?? 0.6;
  const top = options.top ?? 5;
  const ranked = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => right.candidate.confidence - left.candidate.confidence || left.index - right.index)
    .map((entry) => entry.candidate);

  const active: ScoredCandidate[] = [];
  const suggested: ScoredCandidate[] = [];
  for (const candidate of ranked) {
    if (candidate.confidence >= threshold && active.length < top) {
      active.push(candidate);
    } else {
      suggested.push(candidate);
    }
  }
  return { active, suggested };
};

/** Renders action items as a flat outliner-compatible checkbox list (`- [ ] item`). Pure. */
export const renderTasksMarkdown = (items: readonly string[]): string =>
  items.map((item) => `- [ ] ${item.trim()}`).join('\n');

/** Builds a plugin-outliner `Outline` whose Text content is the checkbox task list. */
export const makeTasksOutline = (name: string, items: readonly string[]): Outline.Outline =>
  Outline.make({ name, content: renderTasksMarkdown(items) });

/** The fully-populated active-topic structure (experiment-local; informs the product `Topic`). */
export type ActiveTopic = {
  readonly label: string;
  readonly summary: string;
  readonly threadIds: readonly string[];
  readonly participants: readonly string[];
  readonly keywords: readonly string[];
  readonly status: string;
  readonly facts: readonly string[];
  readonly tasks: Outline.Outline;
  readonly drafts: ReadonlyArray<{ readonly threadId: string; readonly draft: string }>;
  readonly confidence: number;
  readonly rationale: string;
  readonly kind: 'active' | 'suggested';
};

/** The LLM-produced parts of an active topic, assembled onto its cluster draft. */
export type PopulatedParts = {
  readonly status: string;
  readonly facts: readonly string[];
  readonly tasks: readonly string[];
  readonly drafts: ReadonlyArray<{ readonly threadId: string; readonly draft: string }>;
};

/** Assembles an active `ActiveTopic` from its scored cluster + LLM parts. Pure (except `Outline.make`). */
export const assembleActiveTopic = (candidate: ScoredCandidate, parts: PopulatedParts): ActiveTopic => ({
  label: candidate.draft.label,
  summary: candidate.draft.summary,
  threadIds: candidate.draft.threadIds,
  participants: candidate.draft.participants,
  keywords: candidate.draft.keywords,
  status: parts.status,
  facts: parts.facts,
  tasks: makeTasksOutline(`${candidate.draft.label} — tasks`, parts.tasks),
  drafts: parts.drafts,
  confidence: candidate.confidence,
  rationale: candidate.rationale,
  kind: 'active',
});

/** A suggested (not-populated) topic — label/summary/counts + confidence only. */
export type SuggestedTopic = {
  readonly label: string;
  readonly summary: string;
  readonly threadCount: number;
  readonly participantCount: number;
  readonly confidence: number;
  readonly rationale: string;
  readonly kind: 'suggested';
};

export const toSuggestedTopic = (candidate: ScoredCandidate): SuggestedTopic => ({
  label: candidate.draft.label,
  summary: candidate.draft.summary,
  threadCount: candidate.draft.threadIds.length,
  participantCount: candidate.draft.participants.length,
  confidence: candidate.confidence,
  rationale: candidate.rationale,
  kind: 'suggested',
});

/** Checks which populated fields an active topic actually filled (for the review checklist). */
export const populatedChecklist = (topic: ActiveTopic): Record<'status' | 'facts' | 'tasks' | 'drafts', boolean> => ({
  status: topic.status.trim().length > 0,
  facts: topic.facts.length > 0,
  tasks: (topic.tasks.content.target?.content ?? '').trim().length > 0,
  drafts: topic.drafts.length > 0,
});

/** Stable filesystem slug for a topic label (report filenames). */
export const topicSlug = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'topic';
