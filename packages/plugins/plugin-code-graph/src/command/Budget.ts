//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Iri, type Model } from '#graph';
import { type CodeGraph } from '#types';

/** Boxes one command adds before the rest go to the trailer; a command is a glance, not a dump. */
export const DEFAULT_MAX_NODES = 40;

/** What did not fit, summarised so the user and the model know what is missing without drawing it. */
export type Trailer = {
  /** Boxes left out. */
  count: number;
  byKind: Record<string, number>;
  /** The packages the left-out boxes sit in, largest first. */
  byGroup: { group: string; count: number }[];
  /** A few left-out labels, in query order. */
  examples: string[];
  /** One line for people and the next model turn. */
  text: string;
};

export type Capped = {
  patch: Model.Patch;
  /** Absent when everything fit. */
  trailer?: Trailer;
};

/**
 * Keeps the first `room` new boxes of a patch (in query order) and the arrows between boxes that end up on the
 * graph; the boxes left out are summarised in a trailer.
 */
export const cap = (current: readonly CodeGraph.Node[], patch: Model.Patch, room: number): Capped => {
  if (patch.nodes.length <= room) {
    return { patch };
  }
  const kept = patch.nodes.slice(0, Math.max(0, room));
  const shown = new Set([...current.map(({ id }) => id), ...kept.map(({ id }) => id)]);
  return {
    patch: { nodes: kept, edges: patch.edges.filter(({ from, to }) => shown.has(from) && shown.has(to)) },
    trailer: summarize(patch.nodes.slice(kept.length)),
  };
};

const EXAMPLES = 5;
const GROUPS = 3;

/** Counts left-out boxes by kind and package and names a few of them. */
export const summarize = (omitted: readonly CodeGraph.Node[]): Trailer => {
  const byKind: Record<string, number> = {};
  const groups = new Map<string, number>();
  for (const node of omitted) {
    byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
    const group = node.group ?? Iri.groupOf(node.id);
    if (group) {
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }
  }
  return render({
    count: omitted.length,
    byKind,
    byGroup: sortGroups(groups),
    examples: omitted.slice(0, EXAMPLES).map(({ label }) => label),
  });
};

/** Folds two trailers of one command into one. */
export const merge = (left: Trailer | undefined, right: Trailer | undefined): Trailer | undefined => {
  if (!left || !right) {
    return left ?? right;
  }
  const byKind = { ...left.byKind };
  for (const [kind, count] of Object.entries(right.byKind)) {
    byKind[kind] = (byKind[kind] ?? 0) + count;
  }
  const groups = new Map(left.byGroup.map(({ group, count }) => [group, count]));
  for (const { group, count } of right.byGroup) {
    groups.set(group, (groups.get(group) ?? 0) + count);
  }
  return render({
    count: left.count + right.count,
    byKind,
    byGroup: sortGroups(groups),
    examples: [...left.examples, ...right.examples].slice(0, EXAMPLES),
  });
};

const sortGroups = (groups: Map<string, number>): Trailer['byGroup'] =>
  [...groups.entries()].map(([group, count]) => ({ group, count })).sort((left, right) => right.count - left.count);

const render = (trailer: Omit<Trailer, 'text'>): Trailer => {
  const kinds = Object.entries(trailer.byKind)
    .sort(([, left], [, right]) => right - left)
    .map(([kind, count]) => `${count} ${kind}${count === 1 ? '' : 's'}`)
    .join(', ');
  const groups = trailer.byGroup
    .slice(0, GROUPS)
    .map(({ group, count }) => `${group} (${count})`)
    .join(', ');
  const moreGroups = trailer.byGroup.length > GROUPS ? `, +${trailer.byGroup.length - GROUPS} more` : '';
  const where = groups ? ` in ${groups}${moreGroups}` : '';
  const moreExamples = trailer.count > trailer.examples.length ? ', \u2026' : '';
  return {
    ...trailer,
    text: `+${trailer.count} not shown: ${kinds}${where}, e.g. ${trailer.examples.join(', ')}${moreExamples}`,
  };
};
