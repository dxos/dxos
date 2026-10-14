//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';

/**
 * The candidate graph every design stage reads and writes. A node is a **file** — the unit the
 * hand-drawn corpus refers to with `%% ref` — carrying a card that describes it well enough for a
 * judge that never sees the code; symbol-level relations are lifted onto the files that declare
 * them, so one edge set serves imports and framework wiring alike.
 */

/** The relations an explorer may follow, each lifted to file → file. */
export const EDGE_KINDS = [
  'imports',
  'providesService',
  'requiresService',
  'layerRequires',
  'implementsOperation',
  'contributesCapability',
  'extends',
  'implDependsOn',
  'apiDependsOn',
  'reexports',
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

/** A relation not in the index: a dropped relay node's in-edge joined to its out-edge. */
export const RELAY = 'relay';

/** What each relation means, as a judge reads it; the wording is the state System One sees. */
export const EDGE_DESCRIPTIONS: Record<EdgeKind, string> = {
  imports: 'file A imports file B at runtime',
  providesService: 'file A declares a layer that provides a service declared in file B',
  requiresService: 'file A declares a layer whose code reads a service declared in file B',
  layerRequires: 'file A declares a layer whose type still needs a service declared in file B',
  implementsOperation: 'file A declares a handler implementing an operation declared in file B',
  contributesCapability: 'file A contributes a capability declared in file B',
  extends: 'a class in file A extends a class or service tag declared in file B',
  implDependsOn: 'code in file A refers to a declaration of file B in a value position',
  apiDependsOn: 'a signature in file A refers to a type declared in file B',
  reexports: 'file A re-exports file B as part of its public surface',
};

export const NodeCard = Schema.Struct({
  /** The file IRI. */
  iri: Schema.String,
  /** The primary declaration's name, else the file's basename. */
  label: Schema.String,
  /** The primary declaration's derived class (`EffectService`, `Plugin`, …) or its syntactic kind. */
  kind: Schema.String,
  path: Schema.String,
  package: Schema.optional(Schema.String),
  /** The package's directory under `packages/` minus its last segment, e.g. `core/echo`. */
  area: Schema.optional(Schema.String),
  /** The file's most connected exported declarations, primary first. */
  symbols: Schema.Array(Schema.String),
  doc: Schema.optional(Schema.String),
  snippet: Schema.optional(Schema.String),
  inDegree: Schema.Number,
  outDegree: Schema.Number,
  /** Why the explorer included it: a seed match or the relation it was reached by. */
  why: Schema.String,
  /** Hops from the nearest seed (0 for a seed). */
  hops: Schema.Number,
  /** The explorer's sources for this file: which queries returned it, or `bridge`. */
  provenance: Schema.optional(Schema.Array(Schema.String)),
});

export type NodeCard = typeof NodeCard.Type;

export const Edge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  kind: Schema.String,
  /** For a relay edge: the dropped nodes it stands in for, in order. */
  via: Schema.optional(Schema.Array(Schema.String)),
});

export type Edge = typeof Edge.Type;

export const Candidates = Schema.Struct({
  prompt: Schema.String,
  explorer: Schema.String,
  seeds: Schema.Array(Schema.String),
  nodes: Schema.Array(NodeCard),
  edges: Schema.Array(Edge),
});

export type Candidates = typeof Candidates.Type;

/** Grouping levels the zoom stage chooses among for the compact diagram. */
export const GROUPINGS = ['package', 'area', 'directory', 'kind'] as const;

export type Grouping = (typeof GROUPINGS)[number];

export const ScoredNode = Schema.Struct({
  ...NodeCard.fields,
  /** Relevance in [0, 1]. */
  score: Schema.Number,
  kept: Schema.Boolean,
});

export type ScoredNode = typeof ScoredNode.Type;

export const Scored = Schema.Struct({
  prompt: Schema.String,
  explorer: Schema.String,
  scorer: Schema.String,
  grouping: Schema.Literals(GROUPINGS),
  /** Relevance per relation kind in [0, 1]. */
  relations: Schema.Record(Schema.String, Schema.Number),
  nodes: Schema.Array(ScoredNode),
  /** Every candidate edge, plus the relay edges pruning added; `kept` edges join kept nodes. */
  edges: Schema.Array(Edge),
});

export type Scored = typeof Scored.Type;

/** The repo-relative path a file IRI names. */
export const pathOf = (iri: string, fileBase: string): string =>
  iri.startsWith(fileBase) ? decodeURIComponent(iri.slice(fileBase.length)) : iri;

/** The file a symbol IRI is scoped to: everything before its fragment. */
export const fileOfSymbol = (iri: string): string => {
  const hash = iri.indexOf('#');
  return hash < 0 ? iri : iri.slice(0, hash);
};

/** `packages/core/echo/echo-client` → `core/echo`; a top-level package is its own area. */
export const areaOf = (packagePath: string | undefined): string | undefined => {
  if (packagePath === undefined) {
    return undefined;
  }
  const segments = packagePath.split('/').filter(Boolean);
  const rooted = segments[0] === 'packages' || segments[0] === 'tools' ? segments.slice(1) : segments;
  return rooted.length > 1 ? rooted.slice(0, -1).join('/') : rooted.join('/');
};

/** In and out degree of every node over the given edges, self-loops excluded. */
export const degrees = (edges: readonly Edge[]): Map<string, { in: number; out: number }> => {
  const result = new Map<string, { in: number; out: number }>();
  const entry = (iri: string) => {
    let value = result.get(iri);
    if (!value) {
      value = { in: 0, out: 0 };
      result.set(iri, value);
    }
    return value;
  };
  for (const edge of edges) {
    if (edge.from !== edge.to) {
      entry(edge.from).out++;
      entry(edge.to).in++;
    }
  }
  return result;
};

/** One edge per (from, to, kind), so parallel facts lifted from several symbols count once. */
export const dedupe = (edges: readonly Edge[]): Edge[] => {
  const seen = new Map<string, Edge>();
  for (const edge of edges) {
    if (edge.from === edge.to) {
      continue;
    }
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.kind}`;
    if (!seen.has(key)) {
      seen.set(key, edge);
    }
  }
  return [...seen.values()];
};

export type PruneOptions = {
  /** Nodes scoring below this are dropped. */
  readonly threshold: number;
  /** At most this many nodes survive, best first. */
  readonly budget: number;
  /** The surviving set, chosen by the caller instead of by score rank (threshold and budget then unused). */
  readonly keep?: ReadonlySet<string>;
  /** Edge kinds that may connect survivors; others are dropped (relays through them included). */
  readonly kinds?: ReadonlySet<string>;
  /** Longest chain of dropped nodes one relay edge may stand for. */
  readonly maxRelay?: number;
};

/**
 * The surviving node set and the edges between it. A dropped node that sat between two survivors
 * becomes a relay edge rather than a gap, because the drawing rule is "when you drop a module, keep
 * the edge it relayed"; a direct edge always wins over a relay for the same pair.
 */
export const prune = (
  nodes: readonly { iri: string; score: number }[],
  edges: readonly Edge[],
  { threshold, budget, keep, kinds, maxRelay = 2 }: PruneOptions,
): { kept: Set<string>; edges: Edge[] } => {
  const ranked = [...nodes].filter((node) => node.score >= threshold).sort((left, right) => right.score - left.score);
  const kept = new Set(keep ?? ranked.slice(0, budget).map((node) => node.iri));
  // An existing relay stays usable, so a second cut (pruned set → diagram) can relay through it again.
  const usable = edges.filter((edge) => kinds === undefined || edge.kind === RELAY || kinds.has(edge.kind));

  const direct = dedupe(usable.filter((edge) => kept.has(edge.from) && kept.has(edge.to)));
  const linked = new Set(direct.map((edge) => `${edge.from}\u0000${edge.to}`));

  const outgoing = new Map<string, string[]>();
  for (const edge of usable) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }

  const relays: Edge[] = [];
  for (const start of kept) {
    // Breadth-first through dropped nodes only, so the shortest relay chain is the one recorded.
    const visited = new Set<string>([start]);
    let frontier: { iri: string; via: string[] }[] = [{ iri: start, via: [] }];
    for (let depth = 0; depth <= maxRelay && frontier.length > 0; depth++) {
      const next: { iri: string; via: string[] }[] = [];
      for (const { iri, via } of frontier) {
        for (const target of outgoing.get(iri) ?? []) {
          if (visited.has(target)) {
            continue;
          }
          visited.add(target);
          if (kept.has(target)) {
            const key = `${start}\u0000${target}`;
            if (via.length > 0 && !linked.has(key)) {
              linked.add(key);
              relays.push({ from: start, to: target, kind: RELAY, via });
            }
          } else if (depth < maxRelay) {
            next.push({ iri: target, via: [...via, target] });
          }
        }
      }
      frontier = next;
    }
  }

  return { kept, edges: [...direct, ...relays] };
};
