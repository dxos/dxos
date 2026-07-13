//
// Copyright 2026 DXOS.org
//

import { type Thread, type TopicDraft, buildThreads, clusterThreads, deriveThreadId } from '@dxos/pipeline-email';
import { Outline } from '@dxos/plugin-outliner';
import { type Message } from '@dxos/types';

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
  /**
   * Every non-owner sender is an automated / no-reply / role address (no human counterparty). Such
   * topics (deletion notices, security alerts, receipts) can be time-sensitive but aren't the
   * relationship topics a CRM centers on — they're down-weighted so person/team topics surface.
   */
  readonly automated: boolean;
};

// No-reply / role local parts that mark an automated sender (no human on the other end).
const AUTOMATED_LOCALPART_RE =
  /^(no-?reply|do-?not-?reply|donotreply|noreply|notifications?|notify|alerts?|updates?|news(letter)?|digest|mailer(-daemon)?|postmaster|bounce|receipts?|billing|invoices?|payments?|accounts?|support|help(desk)?|hello|info|team|sales|marketing|promo(tions)?|security|system|automated|admin)([._+\-]|$)/i;

/** Whether an email address looks automated (no-reply / role local part). */
export const isAutomatedAddress = (email: string): boolean => {
  const localPart = email.split('@')[0] ?? '';
  return AUTOMATED_LOCALPART_RE.test(localPart);
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
  /** Multiplier applied to a fully-automated topic's score (default 0.35), so person topics rank above. */
  readonly automatedFactor?: number;
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
  const score = weighted / totalWeight;
  // Fully-automated topics (no human counterparty) are down-weighted so relationship topics rank above.
  return signals.automated ? score * (options.automatedFactor ?? 0.35) : score;
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

/** The experiment's output: the populated active topics + the lower-confidence suggestions. */
export type ActiveTopicsResult = {
  readonly active: readonly ActiveTopic[];
  readonly suggested: readonly SuggestedTopic[];
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

// Per-cluster context handed to the injected LLM deps so they can build prompts from the raw threads
// and messages, not just the draft's rolled-up fields.
export type TopicContext = {
  readonly draft: TopicDraft;
  readonly threads: Thread[];
  readonly messages: Message.Message[];
};

/** Effectful dependencies, injected so the orchestration stays pure/testable (the driver wires LLMs). */
export type ActiveTopicsDeps = {
  readonly confidence: (context: TopicContext) => Promise<{ confidence: number; rationale: string }>;
  readonly status: (context: TopicContext) => Promise<string>;
  readonly facts: (context: TopicContext) => Promise<string[]>;
  readonly tasks: (context: TopicContext) => Promise<string[]>;
  readonly draft: (context: TopicContext) => Promise<Array<{ threadId: string; draft: string }>>;
};

export type ActiveTopicsInput = {
  readonly messages: readonly Message.Message[];
  /** Wall-clock now (ms), injected. */
  readonly nowMs: number;
  /** Mailbox owner email(s) — steers `buildThreads` awaiting-mine inference (accepts aliases). */
  readonly ownerEmail?: string | readonly string[];
  /** Known-person emails (lowercased) — the person-linked activity signal. */
  readonly personEmails?: ReadonlySet<string>;
  readonly activity?: Omit<ActivityOptions, 'nowMs'>;
  /** Minimum activity score to be scored by the LLM (prefilter). */
  readonly prefilterFloor?: number;
  /** Max candidates scored by the LLM (highest activity first). */
  readonly candidateLimit?: number;
  /** LLM weight in the confidence blend. */
  readonly confidenceWeight?: number;
  readonly split?: SplitOptions;
};

const latestCreatedMsByThread = (messages: readonly Message.Message[]): Map<string, number> => {
  const recency = new Map<string, number>();
  for (const message of messages) {
    const threadId = deriveThreadId(message);
    const created = new Date(message.created).getTime();
    recency.set(threadId, Math.max(recency.get(threadId) ?? 0, Number.isFinite(created) ? created : 0));
  }
  return recency;
};

/** Deterministic per-cluster signals from precomputed thread maps + the draft's rolled-up fields. Pure. */
export const computeClusterSignals = (
  draft: TopicDraft,
  maps: {
    readonly threadRecency: ReadonlyMap<string, number>;
    readonly awaitingThreadIds: ReadonlySet<string>;
    readonly personEmails?: ReadonlySet<string>;
    readonly ownerEmails?: ReadonlySet<string>;
  },
): ClusterSignals => {
  // Non-owner senders; a topic is automated when every one of them is a no-reply/role address.
  const counterparties = draft.participants.filter((email) => !maps.ownerEmails?.has(email.toLowerCase()));
  return {
    latestCreatedMs: Math.max(0, ...draft.threadIds.map((id) => maps.threadRecency.get(id) ?? 0)),
    awaitingMine: draft.threadIds.some((id) => maps.awaitingThreadIds.has(id)),
    personLinked: draft.participants.some((email) => maps.personEmails?.has(email.toLowerCase()) ?? false),
    openItemCount: draft.questions.length + draft.tasks.length,
    automated: counterparties.length > 0 && counterparties.every(isAutomatedAddress),
  };
};

/**
 * Runs the Active Topics experiment: cluster → deterministic activity score + prefilter → LLM
 * confidence → split active/suggested → populate active topics (status / facts / tasks / drafts). The
 * LLM steps are INJECTED (`deps`) so this is unit-testable with stubs; the driver wires the real
 * model-backed deps.
 */
export const runActiveTopics = async (
  input: ActiveTopicsInput,
  deps: ActiveTopicsDeps,
): Promise<ActiveTopicsResult> => {
  const nowIso = new Date(input.nowMs).toISOString();
  const threads = buildThreads(input.messages, { ownerEmail: input.ownerEmail ?? '', now: nowIso });
  const threadById = new Map(threads.map((thread) => [thread.threadId, thread] as const));
  const messagesByThread = new Map<string, Message.Message[]>();
  for (const message of input.messages) {
    const threadId = deriveThreadId(message);
    (messagesByThread.get(threadId) ?? messagesByThread.set(threadId, []).get(threadId)!).push(message);
  }
  const threadRecency = latestCreatedMsByThread(input.messages);
  const awaitingThreadIds = new Set(
    threads.filter((thread) => thread.state === 'awaiting-mine').map((thread) => thread.threadId),
  );
  const ownerEmails = new Set(
    (Array.isArray(input.ownerEmail) ? input.ownerEmail : input.ownerEmail ? [input.ownerEmail] : []).map((email) =>
      email.toLowerCase(),
    ),
  );

  const contextFor = (draft: TopicDraft): TopicContext => ({
    draft,
    threads: draft.threadIds.flatMap((id) => (threadById.has(id) ? [threadById.get(id)!] : [])),
    messages: draft.threadIds.flatMap((id) => messagesByThread.get(id) ?? []),
  });

  // Deterministic activity score + prefilter → candidates (highest activity first, capped).
  const floor = input.prefilterFloor ?? 0.15;
  const scoredByActivity = clusterThreads(threads)
    .map((draft) => ({
      draft,
      activity: activityScore(
        computeClusterSignals(draft, {
          threadRecency,
          awaitingThreadIds,
          personEmails: input.personEmails,
          ownerEmails,
        }),
        {
          nowMs: input.nowMs,
          ...input.activity,
        },
      ),
    }))
    .filter((entry) => entry.activity >= floor)
    .sort((left, right) => right.activity - left.activity)
    .slice(0, input.candidateLimit ?? 20);

  // LLM confidence per candidate (degrades to the activity score on failure).
  const candidates: ScoredCandidate[] = [];
  for (const { draft, activity } of scoredByActivity) {
    const context = contextFor(draft);
    let llm = { confidence: activity, rationale: '' };
    try {
      llm = await deps.confidence(context);
    } catch {
      // Keep the deterministic score.
    }
    candidates.push({
      draft,
      confidence: combineConfidence(activity, llm.confidence, input.confidenceWeight),
      rationale: llm.rationale,
    });
  }

  const { active: activeCandidates, suggested } = classifyTopics(candidates, input.split);

  // Populate each active topic.
  const active: ActiveTopic[] = [];
  for (const candidate of activeCandidates) {
    const context = contextFor(candidate.draft);
    const [status, facts, tasks, drafts] = await Promise.all([
      deps.status(context),
      deps.facts(context),
      deps.tasks(context),
      deps.draft(context),
    ]);
    active.push(assembleActiveTopic(candidate, { status, facts, tasks, drafts }));
  }

  return { active, suggested: suggested.map(toSuggestedTopic) };
};

/** Stable filesystem slug for a topic label (report filenames). */
export const topicSlug = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'topic';
