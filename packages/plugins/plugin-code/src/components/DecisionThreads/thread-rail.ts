//
// Copyright 2026 DXOS.org
//

import { type ChangelogGraphModel, type DecisionModel } from '../ChangelogGraph/index.ts';

/** One row of a thread's rail: the lane its dot sits in and the lines that cross the row. */
export type RailRow = {
  decision: DecisionModel;
  lane: number;
  /** Lanes whose line runs the full height of the row. */
  through: number[];
  /** Lanes whose line comes down into this row's dot: a later decision builds on this one. */
  incoming: number[];
  /** Lanes whose line leaves this row's dot downwards, to a decision it builds on. */
  outgoing: number[];
};

/** Decisions joined by builds-on, supersedes and approves links, newest first. */
export type DecisionThread = {
  /** The id of its newest decision. */
  id: string;
  rows: RailRow[];
  /** How many lanes the rail needs. */
  lanes: number;
  /** Its superseded decisions, drawn only when asked for. */
  superseded: number;
};

export type DecisionThreadOptions = {
  /** Whether superseded decisions are drawn. */
  superseded?: boolean;
};

const THREAD_EDGES = new Set(['builds-on', 'supersedes', 'approves']);

/**
 * A changelog's decisions as threads: the connected groups of decisions that cite each other, newest thread first.
 * Each thread lists its decisions newest first, and lays them on lanes the way `git log --graph` does.
 */
export const threadsOf = (
  graph: ChangelogGraphModel,
  { superseded = false }: DecisionThreadOptions = {},
): DecisionThread[] => {
  const decisions = graph.nodes.filter((node): node is DecisionModel => node.kind === 'decision');
  const order = new Map(decisions.map(({ id }, index) => [id, index]));
  const edges = graph.edges.filter(({ kind, from, to }) => THREAD_EDGES.has(kind) && order.has(from) && order.has(to));

  const root = new Map(decisions.map(({ id }) => [id, id]));
  const find = (id: string): string => {
    const parent = root.get(id) ?? id;
    if (parent === id) {
      return id;
    }
    const top = find(parent);
    root.set(id, top);
    return top;
  };
  edges.forEach(({ from, to }) => root.set(find(from), find(to)));

  const members = new Map<string, DecisionModel[]>();
  decisions.forEach((decision) => {
    const key = find(decision.id);
    members.set(key, [...(members.get(key) ?? []), decision]);
  });

  // An edge points from the earlier decision to the later one; the rail draws it from the later one down.
  const parents = new Map<string, string[]>();
  edges.forEach(({ from, to }) => parents.set(to, [...(parents.get(to) ?? []), from]));

  return [...members.values()]
    .map((all): DecisionThread => {
      const shown = all.filter((decision) => superseded || !decision.supersededBy).reverse();
      const visible = new Set(shown.map(({ id }) => id));
      return {
        id: all[all.length - 1].id,
        ...railOf(shown, (id) => (parents.get(id) ?? []).filter((parent) => visible.has(parent))),
        superseded: all.filter(({ supersededBy }) => supersededBy).length,
      };
    })
    .filter(({ rows }) => rows.length > 0)
    .sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0));
};

/** Lays newest-first decisions on lanes: a lane waits for the decision a line points at, and is freed once it arrives. */
const railOf = (
  decisions: readonly DecisionModel[],
  parentsOf: (id: string) => string[],
): Pick<DecisionThread, 'rows' | 'lanes'> => {
  // What each lane is waiting for; undefined when free.
  const waiting: (string | undefined)[] = [];
  const free = () => {
    const index = waiting.indexOf(undefined);
    return index === -1 ? waiting.length : index;
  };
  const rows = decisions.map((decision): RailRow => {
    const incoming = waiting.flatMap((id, lane) => (id === decision.id ? [lane] : []));
    incoming.forEach((lane) => (waiting[lane] = undefined));
    const lane = incoming[0] ?? free();
    const through = waiting.flatMap((id, index) => (id !== undefined && index !== lane ? [index] : []));
    const outgoing: number[] = [];
    for (const parent of parentsOf(decision.id)) {
      const next = waiting[lane] === undefined ? lane : free();
      waiting[next] = parent;
      outgoing.push(next);
    }
    return { decision, lane, through, incoming, outgoing };
  });
  return {
    rows,
    lanes: Math.max(1, ...rows.flatMap(({ lane, outgoing }) => [lane + 1, ...outgoing.map((l) => l + 1)])),
  };
};
