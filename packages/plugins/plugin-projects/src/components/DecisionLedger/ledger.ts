//
// Copyright 2026 DXOS.org
//

import {
  type ChangelogGraphModel,
  type DecisionModel,
  awaitsApproval,
  holds,
  isApproval,
} from '../DecisionModel/index.ts';

/** Which decisions the ledger lists: those that hold, those replaced, those awaiting approval, or the questions. */
export type LedgerStatus = 'holds' | 'replaced' | 'unapproved' | 'questions';

export type LedgerFilter = {
  status: LedgerStatus;
  /** Matched against a decision's id, prose and the blocks it affects, ignoring case. */
  text?: string;
  /** The decider's handle. */
  decider?: string;
};

/** The group of decisions that affect no block. */
export const NO_BLOCK = '';

/** The decisions that affect one block. */
export type LedgerBlock = {
  /** The block id as the spec writes it, or {@link NO_BLOCK}. */
  label: string;
  /** Every decision on the block, newest first. */
  decisions: DecisionModel[];
  /** Those the filter lets through, newest first. */
  matching: DecisionModel[];
};

/** Decisions on one block that cite one another, oldest first. */
export type LedgerThread = {
  /** The id of its newest decision. */
  id: string;
  /** What it is about: the first clause of the first decision a person made in it, else of its first decision. */
  title: string;
  decisions: DecisionModel[];
};

/** A decision and the decisions that fill it in on the same day, which read as one step of a thread. */
export type LedgerStep = DecisionModel[];

/** One day of a thread. */
export type LedgerDay = { date?: string; steps: LedgerStep[] };

/** The changelog's decisions in log order, without approvals, which the ledger shows on what they approve. */
export const ledgerDecisions = (graph: ChangelogGraphModel): DecisionModel[] =>
  graph.nodes.filter((node): node is DecisionModel => node.kind === 'decision' && !isApproval(node.entry));

export const matchesFilter = (decision: DecisionModel, { status, text, decider }: LedgerFilter): boolean => {
  if (status === 'holds' && !holds(decision)) {
    return false;
  }
  if (status === 'replaced' && holds(decision)) {
    return false;
  }
  if (status === 'unapproved' && !awaitsApproval(decision)) {
    return false;
  }
  if (decider && decision.handle !== decider) {
    return false;
  }
  const query = text?.trim().toLowerCase();
  return (
    !query ||
    [decision.id, decision.entry.title, ...decision.entry.affects].some((value) => value.toLowerCase().includes(query))
  );
};

/** A changelog's decisions by the block each affects, the block decided on most recently first. */
export const ledgerBlocks = (decisions: readonly DecisionModel[], filter: LedgerFilter): LedgerBlock[] => {
  const blocks = new Map<string, DecisionModel[]>();
  for (const decision of [...decisions].reverse()) {
    const labels = decision.entry.affects.length > 0 ? decision.entry.affects : [NO_BLOCK];
    labels.forEach((label) => blocks.set(label, [...(blocks.get(label) ?? []), decision]));
  }
  return [...blocks.entries()].map(([label, decisions]) => ({
    label,
    decisions,
    matching: decisions.filter((decision) => matchesFilter(decision, filter)),
  }));
};

const firstClause = (text: string): string => text.match(/^.+?[.;:](?=\s|$)/)?.[0].slice(0, -1) ?? text;

/** The decisions of one block, split into the groups that cite one another, the most recent thread first. */
export const ledgerThreads = (decisions: readonly DecisionModel[]): LedgerThread[] => {
  const oldestFirst = [...decisions].sort((left, right) => idNumber(left.id) - idNumber(right.id));
  const root = new Map(oldestFirst.map(({ id }) => [id, id]));
  const find = (id: string): string => {
    const parent = root.get(id) ?? id;
    return parent === id ? id : find(parent);
  };
  for (const { id, cites } of oldestFirst) {
    cites.filter((citation) => root.has(citation.id)).forEach((citation) => root.set(find(citation.id), find(id)));
  }
  const members = new Map<string, DecisionModel[]>();
  oldestFirst.forEach((decision) => {
    const key = find(decision.id);
    members.set(key, [...(members.get(key) ?? []), decision]);
  });
  return [...members.values()]
    .map((thread): LedgerThread => {
      const lead = thread.find(({ actor }) => actor === 'user') ?? thread[0];
      return { id: thread[thread.length - 1].id, title: firstClause(lead.entry.title), decisions: thread };
    })
    .sort((left, right) => idNumber(right.id) - idNumber(left.id));
};

/**
 * A thread by day, oldest first; within a day, a decision and the agent decisions that fill it in are one step, so a
 * person's call reads with the detail an agent added to it.
 */
export const ledgerDays = (thread: LedgerThread): LedgerDay[] => {
  const days: LedgerDay[] = [];
  for (const decision of thread.decisions) {
    let day = days[days.length - 1];
    if (!day || day.date !== decision.entry.date) {
      day = { date: decision.entry.date, steps: [] };
      days.push(day);
    }
    const step = day.steps.find(([lead]) =>
      decision.cites.some(({ id, kind }) => kind === 'fills-in' && id === lead.id),
    );
    if (step && decision.actor === 'agent') {
      step.push(decision);
    } else {
      day.steps.push([decision]);
    }
  }
  return days;
};

/** The ids of the decisions in `decisions` that await approval, in log order. */
export const unapprovedIds = (decisions: readonly DecisionModel[]): string[] =>
  decisions
    .filter(awaitsApproval)
    .map(({ id }) => id)
    .sort((left, right) => idNumber(left) - idNumber(right));

const idNumber = (id: string): number => Number(/(\d+)$/.exec(id)?.[1] ?? 0);
