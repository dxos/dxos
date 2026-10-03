//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type * as Store from '../Store.ts';
import * as Cache from './Cache.ts';
import * as Compact from './Compact.ts';
import * as Explore from './Explore.ts';
import * as Graph from './Graph.ts';
import * as SystemOne from './SystemOne.ts';
import * as Zoom from './Zoom.ts';

/**
 * The design pipeline up to, but not including, layout: explore → zoom → compact variants. Layout
 * and judging need ELK and therefore Node (`Draw.ts`), so this half stays runnable under Bun and
 * hands its variants over as files.
 */

export class DesignError extends Data.TaggedError('code-index/design/DesignError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Options = {
  readonly prompt: string;
  readonly scorer: Zoom.Scorer;
  readonly model: string;
  readonly cache: Cache.Api;
  /** Nodes the pruned graph keeps (the force view shows these; the diagram cuts them to ≲ 14). */
  readonly budget: number;
  readonly threshold: number;
};

export type Timings = { exploreMs: number; zoomMs: number; totalMs: number };

export type Result = {
  readonly candidates: Graph.Candidates;
  readonly scored: Graph.Scored;
  readonly diagrams: readonly Compact.Diagram[];
  readonly usage: Zoom.Usage;
  readonly timings: Timings;
};

/** Runs every stage before layout, given an explorer already bound to its store. */
export const run = <E, R>(
  explore: Effect.Effect<Graph.Candidates, E, R>,
  options: Options,
): Effect.Effect<Result, E, R | DecisionModel.DecisionModel> =>
  Effect.gen(function* () {
    const started = Date.now();
    const candidates = yield* explore;
    const explored = Date.now();
    const { scored, usage } = yield* Zoom.zoom({ ...options, candidates });
    const zoomed = Date.now();
    const diagrams = Compact.variants(scored.grouping).map((variant) => Compact.build(scored, variant));
    return {
      candidates,
      scored,
      diagrams,
      usage,
      timings: { exploreMs: explored - started, zoomMs: zoomed - explored, totalMs: zoomed - started },
    };
  });

/** The pruned graph alone: what the force view and the MCP tool present. */
export const pruned = (scored: Graph.Scored) => ({
  prompt: scored.prompt,
  grouping: scored.grouping,
  nodes: scored.nodes.filter((node) => node.kept),
  edges: Zoom.keptEdges(scored),
});

/** Writes each stage's JSON for inspection; `draw-main.ts` reads `diagrams.json` from the same directory. */
export const write = (dir: string, result: Result): Effect.Effect<string[], DesignError> =>
  Effect.try({
    try: () => {
      mkdirSync(dir, { recursive: true });
      const files: Record<string, unknown> = {
        'candidates.json': result.candidates,
        'scores.json': {
          scorer: result.scored.scorer,
          grouping: result.scored.grouping,
          relations: result.scored.relations,
          nodes: result.scored.nodes.map(({ iri, label, path, score, kept }) => ({ iri, label, path, score, kept })),
        },
        'pruned.json': pruned(result.scored),
        'diagrams.json': result.diagrams,
        'run.json': { prompt: result.scored.prompt, usage: result.usage, timings: result.timings },
      };
      return Object.entries(files).map(([name, value]) => {
        const path = join(dir, name);
        writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
        return path;
      });
    },
    catch: (cause) => new DesignError({ message: `Cannot write ${dir}`, cause }),
  });

/** A node or edge as the sandbox's `display.graph` takes it. */
export type GraphData = {
  readonly nodes: readonly {
    id: string;
    label: string;
    group?: string;
    score: number;
    kept: boolean;
    card: Record<string, unknown>;
  }[];
  readonly edges: readonly { from: string; to: string; kind: string }[];
};

/** Most below-threshold nodes a presentation carries; past this they only crowd the force layout. */
export const HIDDEN_LIMIT = 100;

/**
 * The scored graph as a force-view presentation: every kept node, the best below-threshold ones so
 * they are a click away, and every edge of a relevant kind between them plus the relays pruning
 * added. A hidden node's card omits its doc and snippet, which are most of a node's weight on the wire.
 */
export const toGraphData = (scored: Graph.Scored): GraphData & { grouping: string; scorer: string } => {
  const hidden = scored.nodes
    .filter((node) => !node.kept)
    .sort((left, right) => right.score - left.score)
    .slice(0, HIDDEN_LIMIT);
  const shown = new Set([...scored.nodes.filter((node) => node.kept), ...hidden].map((node) => node.iri));
  const nodes = scored.nodes.filter((node) => shown.has(node.iri));
  return {
    grouping: scored.grouping,
    scorer: scored.scorer,
    nodes: nodes.map((node) => ({
      id: node.iri,
      label: node.label,
      ...(node.package ? { group: node.package } : {}),
      score: Number(node.score.toFixed(3)),
      kept: node.kept,
      card: {
        path: node.path,
        kind: node.kind,
        package: node.package,
        score: Number(node.score.toFixed(3)),
        declarations: node.symbols.join(', '),
        ...(node.kept ? { doc: node.doc, snippet: node.snippet } : {}),
        why: node.why,
      },
    })),
    edges: Graph.dedupe(
      scored.edges.filter(
        (edge) =>
          shown.has(edge.from) &&
          shown.has(edge.to) &&
          (edge.kind === Graph.RELAY || (scored.relations[edge.kind] ?? 0) >= 0.5),
      ),
    ).map(({ from, to, kind }) => ({ from, to, kind })),
  };
};

/** Explore (deterministic) and zoom with whichever decision model is in context. */
const scoreFor = (
  store: Store.Api,
  cache: Cache.Api,
  scorer: Zoom.Scorer,
  { prompt, budget = 30, threshold = 0.3 }: { prompt: string; budget?: number; threshold?: number },
): Effect.Effect<Graph.Scored, Store.StoreError, DecisionModel.DecisionModel> =>
  Effect.gen(function* () {
    const candidates = yield* Explore.bfs({ prompt })(store);
    const { scored } = yield* Zoom.zoom({
      prompt,
      candidates,
      scorer,
      model: SystemOne.MODEL.id.toString(),
      cache,
      threshold,
      budget,
    });
    return scored;
  });

/**
 * The deterministic explorer plus zoom, as the sandbox's `design.subgraph` runs it: the hybrid scorer
 * when a decision model is in context, the baseline otherwise — the chat must work with no key at all.
 */
export const subgraph = (
  store: Store.Api,
  cache: Cache.Api,
  model: Option.Option<DecisionModel.DecisionModel>,
  options: { prompt: string; budget?: number; threshold?: number },
): Effect.Effect<GraphData & { grouping: string; scorer: string }, Store.StoreError> =>
  Option.match(model, {
    onNone: () => scoreFor(store, cache, 'baseline', options).pipe(Effect.provide(SystemOne.refusing)),
    onSome: (service) =>
      scoreFor(store, cache, 'hybrid', options).pipe(Effect.provideService(DecisionModel.DecisionModel, service)),
  }).pipe(Effect.map(toGraphData));

/**
 * The answer an MCP client gets: the pruned graph and a compact mermaid draft. The draft is not laid
 * out or judged — that needs ELK, which only the Node half (`code-index design`) runs.
 */
export const answer = (
  store: Store.Api,
  cache: Cache.Api,
  options: { prompt: string; budget?: number; threshold?: number },
) =>
  Effect.gen(function* () {
    const scorer: Zoom.Scorer = SystemOne.available() ? 'hybrid' : 'baseline';
    const scored = yield* scoreFor(store, cache, scorer, options).pipe(
      Effect.provide(SystemOne.available() ? SystemOne.layer : SystemOne.refusing),
    );
    const [variant] = Compact.variants(scored.grouping);
    return {
      scorer,
      grouping: scored.grouping,
      nodes: scored.nodes
        .filter((node) => node.kept)
        .sort((left, right) => right.score - left.score)
        .map(({ iri, label, kind, path, package: owner, score }) => ({
          iri,
          label,
          kind,
          path,
          ...(owner ? { package: owner } : {}),
          score: Number(score.toFixed(3)),
        })),
      edges: Zoom.keptEdges(scored).map(({ from, to, kind }) => ({ from, to, kind })),
      mermaid: Compact.build(scored, variant).mermaid,
    };
  });
