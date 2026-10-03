//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Decision from 'effect/ai/Decision';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Cache from './Cache.ts';
import * as Graph from './Graph.ts';
import * as Text from './Text.ts';

/**
 * The precision stage: a decision model (System One) judges each candidate card against the prompt,
 * each relation kind, and — once the set is pruned — the grouping level the compact diagram should
 * use. Every call is one card or one relation as the whole state, so calls are small, independent
 * and cacheable, and 16 of them run at once.
 *
 * The `baseline` scorer answers the same questions from text match, degree and hop distance with no
 * model at all; it exists so the evaluation can say whether the model earns its calls.
 */

/** System One's price per input token, for the cost line of a run. */
export const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

/** What the judge sees of a card: no IRI, no explorer bookkeeping — only what describes the code. */
const JudgedCard = Schema.Struct({
  name: Schema.String,
  kind: Schema.String,
  path: Schema.String,
  package: Schema.optional(Schema.String),
  declarations: Schema.Array(Schema.String),
  doc: Schema.optional(Schema.String),
  snippet: Schema.optional(Schema.String),
  links: Schema.String,
});

const judgedCard = (card: Graph.NodeCard): typeof JudgedCard.Type => ({
  name: card.label,
  kind: card.kind,
  path: card.path,
  ...(card.package ? { package: card.package } : {}),
  declarations: card.symbols,
  ...(card.doc ? { doc: card.doc } : {}),
  ...(card.snippet ? { snippet: card.snippet } : {}),
  links: `${card.inDegree} files depend on it, it depends on ${card.outDegree}`,
});

export const NodeRelevance = Decision.make({
  input: Schema.Struct({ prompt: Schema.String, node: JudgedCard }),
  decisions: {
    matters: Decision.probability({
      instructions:
        'A developer asked `prompt` about a codebase and will be shown a small architecture diagram as the ' +
        'answer. `node` is one source file. Would a senior engineer drawing that diagram include this file as one ' +
        'of its boxes — a component the answer is about — rather than a helper, test, type-only file or something ' +
        'from an unrelated area?',
      criteria: {
        true: 'A component the answer is about; leaving it out would leave the diagram incomplete.',
        false: 'A helper, test, constant, type-only or unrelated file; the answer is complete without it.',
      },
    }),
  },
});

export const RelationRelevance = Decision.make({
  input: Schema.Struct({ prompt: Schema.String, relation: Schema.String, examples: Schema.Array(Schema.String) }),
  decisions: {
    matters: Decision.probability({
      instructions:
        'A developer asked `prompt` about a codebase and will be shown an architecture diagram as the answer. ' +
        '`relation` describes one kind of arrow between files, with `examples`. Should arrows of this kind be drawn ' +
        'in that diagram because they show how the parts answer the question?',
      criteria: {
        true: 'These arrows explain the answer.',
        false: 'These arrows are noise for this question.',
      },
    }),
  },
});

const GROUPING_CRITERIA: Record<Graph.Grouping, string> = {
  package: 'Box the components by the npm package that contains them.',
  area: 'Box them by product area (the folder above the package, e.g. core/echo, sdk, plugins).',
  directory: "Box them by their source directory inside the package (the module's role).",
  kind: 'Box them by what they are (service, layer, plugin, operation, class, function).',
};

export const GroupingChoice = Decision.make({
  input: Schema.Struct({
    prompt: Schema.String,
    nodes: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        package: Schema.String,
        area: Schema.String,
        directory: Schema.String,
        kind: Schema.String,
      }),
    ),
  }),
  decisions: {
    grouping: Decision.classify({
      instructions:
        'These components will be drawn as an architecture diagram answering `prompt`, with at most three labelled ' +
        'boxes grouping them. Which grouping makes the answer easiest to read?',
      criteria: GROUPING_CRITERIA,
    }),
  },
});

export type Scorer = 'system-one' | 'baseline';

export type Usage = {
  /** Decision calls actually sent (cache misses). */
  calls: number;
  cached: number;
  inputTokens: number;
  usd: number;
};

export type ZoomOptions = {
  readonly prompt: string;
  readonly candidates: Graph.Candidates;
  readonly scorer: Scorer;
  readonly model: string;
  readonly cache: Cache.Api;
  readonly threshold: number;
  readonly budget: number;
  readonly concurrency?: number;
};

export type ZoomResult = {
  readonly scored: Graph.Scored;
  readonly usage: Usage;
};

/** The directory a file sits in, relative to its package: its module's role. */
export const directoryOf = (card: Pick<Graph.NodeCard, 'path'>, packagePath?: string): string => {
  const parts = card.path.split('/');
  parts.pop();
  const relative =
    packagePath && card.path.startsWith(`${packagePath}/`) ? parts.slice(packagePath.split('/').length) : parts;
  const meaningful = relative.filter((part) => part !== 'src');
  return meaningful.length > 0 ? meaningful.join('/') : '.';
};

/** The package directory a card's path implies (`…/src/…` is inside it). */
export const packagePathOf = (path: string): string | undefined => {
  const index = path.indexOf('/src/');
  return index > 0 ? path.slice(0, index) : undefined;
};

type Context = { readonly model: string; readonly cache: Cache.Api; readonly usage: Usage };

/**
 * One decision, through the cache, reduced to the one value the caller uses. The cache holds that
 * value rather than the provider's answer object, so a hit is checked by `validate` instead of being
 * trusted. A failed call yields `undefined`, so an outage never reads as "irrelevant".
 */
const decide = <I extends Schema.Constraint, D extends Record<string, Decision.Any>, T>(
  definition: Decision.Definition<I, D>,
  input: I['Type'],
  extract: (answers: Decision.Answers<D>) => T,
  validate: (value: unknown) => T | undefined,
  { model, cache, usage }: Context,
): Effect.Effect<T | undefined, never, DecisionModel.DecisionModel | I['EncodingServices']> => {
  const key = Cache.keyOf({ model, decisions: definition.decisions, input });
  const hit = validate(cache.get(key));
  if (hit !== undefined) {
    usage.cached++;
    return Effect.succeed(hit);
  }
  return DecisionModel.decide(definition, { input }).pipe(
    Effect.map(({ answers, usage: spent }) => {
      usage.calls++;
      usage.inputTokens += spent.inputTokens ?? 0;
      usage.usd = usage.inputTokens * USD_PER_INPUT_TOKEN;
      return extract(answers);
    }),
    Effect.tap((value) => cache.set(key, value).pipe(Effect.ignore)),
    Effect.catch(() => Effect.succeed(undefined)),
  );
};

const asProbability = (value: unknown): number | undefined =>
  typeof value === 'number' && value >= 0 && value <= 1 ? value : undefined;

const asGrouping = (value: unknown): Graph.Grouping | undefined =>
  Graph.GROUPINGS.find((grouping) => grouping === value);

/** Text match, degree and proximity to a seed, combined into [0, 1] with no model involved. */
export const baselineScore = (query: Text.Query, card: Graph.NodeCard, maxDegree: number): number => {
  const text = Text.match(query, `${card.label} ${card.path} ${card.symbols.join(' ')} ${card.doc ?? ''}`);
  const degree = maxDegree > 0 ? Math.log1p(card.inDegree + card.outDegree) / Math.log1p(maxDegree) : 0;
  const proximity = 1 / (1 + card.hops);
  const penalty = /(\.test\.|\/testing\/|\.stories\.|\/index\.ts$|\/types?\.ts$|\/defs\.ts$)/.test(card.path) ? 0.5 : 1;
  return penalty * (0.5 * text + 0.3 * degree + 0.2 * proximity);
};

/**
 * Scores, prunes and chooses a grouping. Everything the drawing stage needs is in the result, scores
 * included, so a second drawing never re-asks a question.
 */
export const zoom = ({
  prompt,
  candidates,
  scorer,
  model,
  cache,
  threshold,
  budget,
  concurrency = 16,
}: ZoomOptions): Effect.Effect<ZoomResult, never, DecisionModel.DecisionModel> =>
  Effect.gen(function* () {
    const usage: Usage = { calls: 0, cached: 0, inputTokens: 0, usd: 0 };
    const context = { model, cache, usage };
    const query = Text.query(prompt);
    const maxDegree = Math.max(0, ...candidates.nodes.map((card) => card.inDegree + card.outDegree));
    const labels = new Map(candidates.nodes.map((card) => [card.iri, card.label]));

    const nodeScores =
      scorer === 'baseline'
        ? candidates.nodes.map((card) => baselineScore(query, card, maxDegree))
        : yield* Effect.forEach(
            candidates.nodes,
            (card) =>
              decide(
                NodeRelevance,
                { prompt, node: judgedCard(card) },
                (answers) => answers.matters.probability,
                asProbability,
                context,
              ).pipe(Effect.map((probability) => probability ?? baselineScore(query, card, maxDegree))),
            { concurrency },
          );

    const kinds = [...new Set(candidates.edges.map((edge) => edge.kind))];
    const relationScores = Object.fromEntries(
      scorer === 'baseline'
        ? kinds.map((kind) => [kind, kind === 'apiDependsOn' || kind === 'reexports' ? 0.3 : 0.8])
        : yield* Effect.forEach(
            kinds,
            (kind) => {
              const examples = candidates.edges
                .filter((edge) => edge.kind === kind)
                .slice(0, 6)
                .map((edge) => `${labels.get(edge.from) ?? edge.from} → ${labels.get(edge.to) ?? edge.to}`);
              const description =
                kind in Graph.EDGE_DESCRIPTIONS ? Graph.EDGE_DESCRIPTIONS[kind as Graph.EdgeKind] : kind;
              return decide(
                RelationRelevance,
                { prompt, relation: description, examples },
                (answers) => answers.matters.probability,
                asProbability,
                context,
              ).pipe(Effect.map((probability) => [kind, probability ?? 0.5] as const));
            },
            { concurrency },
          ),
    );

    const relevantKinds = new Set(kinds.filter((kind) => (relationScores[kind] ?? 0) >= 0.5));
    // A question whose relation kinds all fall below 0.5 still needs arrows; imports are the floor.
    if (relevantKinds.size === 0) {
      relevantKinds.add('imports');
    }
    const scoredNodes = candidates.nodes.map((card, index) => ({ ...card, score: nodeScores[index] }));
    const { kept, edges: keptEdges } = Graph.prune(scoredNodes, candidates.edges, {
      threshold,
      budget,
      kinds: relevantKinds,
    });

    const survivors = scoredNodes.filter((node) => kept.has(node.iri));
    let grouping: Graph.Grouping = 'package';
    if (scorer === 'system-one' && survivors.length > 0) {
      const chosen = yield* decide(
        GroupingChoice,
        {
          prompt,
          nodes: survivors.slice(0, 40).map((node) => ({
            name: node.label,
            package: node.package ?? '',
            area: node.area ?? '',
            directory: directoryOf(node, packagePathOf(node.path)),
            kind: node.kind,
          })),
        },
        (answers) => answers.grouping.label,
        asGrouping,
        context,
      );
      grouping = chosen ?? grouping;
    } else {
      grouping = new Set(survivors.map((node) => node.package)).size <= 1 ? 'directory' : 'package';
    }

    const relays = keptEdges.filter((edge) => edge.kind === Graph.RELAY);
    return {
      scored: {
        prompt,
        explorer: candidates.explorer,
        scorer,
        grouping,
        relations: relationScores,
        nodes: scoredNodes.map((node) => ({ ...node, kept: kept.has(node.iri) })),
        edges: [...candidates.edges, ...relays],
      },
      usage,
    };
  });

/** The edges of a scored graph that join two kept nodes through a relevant relation, relays included. */
export const keptEdges = (scored: Graph.Scored, threshold = 0.5): Graph.Edge[] => {
  const kept = new Set(scored.nodes.filter((node) => node.kept).map((node) => node.iri));
  return Graph.dedupe(
    scored.edges.filter(
      (edge) =>
        kept.has(edge.from) &&
        kept.has(edge.to) &&
        (edge.kind === Graph.RELAY || (scored.relations[edge.kind] ?? 0) >= threshold),
    ),
  );
};
