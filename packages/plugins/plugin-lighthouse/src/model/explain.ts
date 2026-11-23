//
// Copyright 2026 DXOS.org
//

// Pure helpers for the trace (lighthouse's EXPLAIN view, `web/src/components/ExplainView.tsx`): formatting, a row's
// place on the session's timeline, and the summary of what ran.

import { type ExplainCategory, type ExplainNode } from '../client/types.ts';

/** "820 ms", "4.2 s", "3m 35s"; empty when there is no time. */
export const formatDuration = (ms?: number): string =>
  ms === undefined
    ? ''
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : ms < 60_000
        ? `${(ms / 1000).toFixed(1)} s`
        : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

/** "$0.0219", "<$0.001"; empty for nothing spent. */
export const formatUsd = (usd: number): string =>
  usd === 0 ? '' : usd < 0.001 ? '<$0.001' : `$${usd.toFixed(usd < 0.1 ? 4 : 3)}`;

/** A count grouped by thousands; empty for zero. */
export const formatCount = (count: number): string => (count ? count.toLocaleString('en-US') : '');

/** "12,034 in (8,000 cached) · 312 out"; empty without tokens. */
export const formatTokens = (tokens?: ExplainNode['tokens']): string =>
  tokens && (tokens.in || tokens.out)
    ? `${(tokens.in ?? 0).toLocaleString('en-US')} in${tokens.cached ? ` (${tokens.cached.toLocaleString('en-US')} cached)` : ''} · ${(tokens.out ?? 0).toLocaleString('en-US')} out`
    : '';

/** A row's own time: a folded group's summed time, else the wall time of what it contains, else its own. */
export const timeOf = (node: ExplainNode): number | undefined => (node.group ? node.ms : (node.wallMs ?? node.ms));

/**
 * Where a row sits on the session's timeline, as percentages of the track. A turn's time is the model's latency
 * before it, so its bar ends at its timestamp. Undefined when the row took no time.
 */
export const barOf = (node: ExplainNode, start: number, span: number): { left: number; width: number } | undefined => {
  const time = timeOf(node);
  if (span <= 0 || !time) {
    return undefined;
  }
  const begin = Date.parse(node.t) - (node.kind === 'turn' ? (node.ms ?? 0) : 0);
  const left = Math.max(0, Math.min(99.6, ((begin - start) / span) * 100));
  const width = Math.min(Math.max(0.4, (time / span) * 100), 100 - left);
  return { left, width };
};

export const walk = (node: ExplainNode, visit: (node: ExplainNode) => void) => {
  visit(node);
  for (const child of node.children) {
    walk(child, visit);
  }
};

/** Rows open on first load: the session and its inputs, so the agent's turns show; folded groups stay closed. */
export const defaultOpen = (tree: ExplainNode): Set<string> =>
  new Set([tree.id, ...tree.children.filter((child) => child.kind === 'input').map((child) => child.id)]);

/** Every row with children, for Expand all. */
export const allOpen = (tree: ExplainNode): Set<string> => {
  const open = new Set<string>();
  walk(tree, (node) => {
    if (node.children.length) {
      open.add(node.id);
    }
  });
  return open;
};

export type CategoryTotals = Record<ExplainCategory, { count: number; ms: number; usd: number }>;

export type TraceSummary = {
  turns: number;
  calls: number;
  failed: number;
  loads: number;
  extracts: number;
  models: number;
  tokensIn: number;
  tokensOut: number;
  /** Time and spend by what ran: the LLM, System One models, and tools with no model. */
  categories: CategoryTotals;
};

/** Counts and totals over the whole trace; a folded group counts through its children. */
export const summarize = (tree: ExplainNode): TraceSummary => {
  const summary: TraceSummary = {
    turns: 0,
    calls: 0,
    failed: 0,
    loads: 0,
    extracts: 0,
    models: 0,
    tokensIn: 0,
    tokensOut: 0,
    categories: {
      'llm': { count: 0, ms: 0, usd: 0 },
      'system-one': { count: 0, ms: 0, usd: 0 },
      'tool': { count: 0, ms: 0, usd: 0 },
    },
  };
  walk(tree, (node) => {
    if ((node.kind === 'turn' || node.kind === 'model') && !node.group) {
      const totals = summary.categories[node.category === 'system-one' ? 'system-one' : 'llm'];
      totals.count++;
      totals.ms += node.ms ?? 0;
      totals.usd += node.usd ?? 0;
    }
    switch (node.kind) {
      case 'turn':
        summary.turns++;
        summary.tokensIn += node.tokens?.in ?? 0;
        summary.tokensOut += node.tokens?.out ?? 0;
        break;
      case 'call':
        summary.calls++;
        summary.categories.tool.count++;
        summary.categories.tool.ms += node.ms ?? node.wallMs ?? 0;
        if (node.ok === false) {
          summary.failed++;
        }
        break;
      case 'load':
        summary.loads++;
        break;
      case 'extract':
        summary.extracts++;
        break;
      case 'model':
        if (!node.group) {
          summary.models++;
        }
        break;
    }
  });
  return summary;
};

/** A CURIE as its prefix (with the colon) and local name, so the prefix can be dimmed: `schema:` + `name`. */
export const splitCurie = (curie: string): [prefix: string, local: string] => {
  const match = /^([a-z][a-z0-9]*:)(?=[A-Za-z])/.exec(curie);
  return match?.[1] ? [match[1], curie.slice(match[1].length)] : ['', curie];
};

/** A histogram's entries, largest first. */
export const histogram = (counts: Record<string, number>): Array<[string, number]> =>
  Object.entries(counts).sort((a, b) => b[1] - a[1]);
