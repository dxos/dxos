//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Decision from 'effect/ai/Decision';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as LanguageModel from 'effect/ai/LanguageModel';
import type * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Model as AiModel, AiService } from '@dxos/ai';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { CodeIndexClient } from '#client';
import { Iri, Model } from '#graph';
import { CodeGraph } from '#types';

import { addPatch, removeNodes } from '../operations/util.ts';
import * as Budget from './Budget.ts';
import * as Filter from './Filter.ts';

/** Fast enough for a command bar; the loop needs one short structured answer per turn. */
export const COMMAND_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Model turns per command; each turn after the first follows a judge saying the command is not done yet. */
export const DEFAULT_MAX_TURNS = 3;

/** Rows a query may return; beyond the node budget they only feed the trailer. */
const QUERY_ROWS = 1000;

/** Boxes listed to the model; past this it sees counts, which is enough to pick a remove filter. */
const LISTED_NODES = 120;

/** The judge's probability, at or above which the command counts as done. */
const DONE_THRESHOLD = 0.5;

/** One thing the model may do to the graph. */
export const Action = Schema.Struct({
  type: Schema.Literals(['add', 'remove']),
  sparql: Schema.optional(Schema.String).annotate({
    description: 'For `add`: a SPARQL SELECT whose rows become boxes (`?node`) or arrows (`?from ?to`).',
  }),
  filter: Schema.optional(Schema.String).annotate({
    description:
      'For `remove`: `*` for every box, `kind:file`, `/regex/`, or text matched against labels, IRIs and packages; `|` separates alternatives.',
  }),
});
export type Action = Schema.Schema.Type<typeof Action>;

/** What the model answers each turn. */
export const Step = Schema.Struct({
  actions: Schema.Array(Action).annotate({ description: 'What to do now; empty when nothing (more) is needed.' }),
  message: Schema.String.annotate({ description: 'One short sentence for the user about what the graph now shows.' }),
});
export type Step = Schema.Schema.Type<typeof Step>;

/** What one action did. */
export type ActionResult = {
  action: Action;
  rows?: number;
  addedNodes: number;
  addedEdges: number;
  removedNodes: number;
  trailer?: Budget.Trailer;
  error?: string;
};

export type Turn = {
  step: Step;
  results: ActionResult[];
  /** The judge's probability that the command is done after this turn; absent when it was not asked. */
  done?: number;
};

export type StopReason = 'done' | 'judge' | 'limit' | 'error';

export type Result = {
  message: string;
  turns: Turn[];
  addedNodes: number;
  removedNodes: number;
  trailer?: Budget.Trailer;
  stop: StopReason;
};

/** Decides between turns whether the command is carried out; returns the probability that it is. */
export type Judge = (input: JudgeInput) => Effect.Effect<number, unknown>;

export const JudgeInput = Schema.Struct({
  command: Schema.String,
  graph: Schema.String,
  lastTurn: Schema.String,
});
export type JudgeInput = Schema.Schema.Type<typeof JudgeInput>;

const Done = Decision.make({
  input: JudgeInput,
  decisions: {
    done: Decision.probability({
      instructions: trim`
        A user typed a command to change a graph of code (packages, files, symbols).
        Does the graph now show what the command asked for, so that no further query is needed?
        An empty result for a reasonable query also counts as done.
      `,
    }),
  },
});

/** A judge backed by a decision model. */
export const decisionJudge =
  (model: DecisionModel.DecisionModel): Judge =>
  (input) =>
    model.decide(Done, { input }).pipe(Effect.map(({ answers }) => answers.done.probability));

export type Options = {
  maxTurns?: number;
  /** Boxes the command may add in total; the rest go to the trailer. */
  maxNodes?: number;
  /** Asked between turns; without one, the loop goes on only after a failed or empty action. */
  judge?: Judge;
};

/**
 * Carries out one typed or spoken command on a graph. The model sees the graph and may only add query results or
 * remove boxes by a text filter; between turns a judge decides whether to stop. Built for one-shot commands such
 * as "clear the graph" or "show me what depends on the identity service", where latency matters more than
 * exploration.
 */
export const run = Effect.fn('CodeGraphCommand.run')(function* (
  graph: CodeGraph.CodeGraph,
  command: string,
  { maxTurns = DEFAULT_MAX_TURNS, maxNodes = Budget.DEFAULT_MAX_NODES, judge }: Options = {},
) {
  const turns: Turn[] = [];
  const history: Prompt.MessageEncoded[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${describeGraph(graph)}\n\nCommand: ${command}` },
  ];
  let budget = maxNodes;
  let stop: StopReason = 'limit';

  for (let index = 0; index < maxTurns; index++) {
    const response = yield* LanguageModel.generateObject({
      prompt: history,
      schema: Step,
      objectName: 'step',
    }).pipe(Effect.catch((error) => Effect.succeed({ error })));
    if ('error' in response) {
      log.info('command model failed', { error: response.error });
      if (turns.length === 0) {
        return yield* Effect.fail(response.error);
      }
      stop = 'error';
      break;
    }
    const step = response.value;
    const results: ActionResult[] = [];
    for (const action of step.actions) {
      const result = yield* apply(graph, action, budget);
      budget -= result.addedNodes;
      results.push(result);
    }
    const turn: Turn = { step, results };
    turns.push(turn);
    if (step.actions.length === 0) {
      stop = 'done';
      break;
    }
    if (index === maxTurns - 1) {
      break;
    }

    const report = describeResults(results);
    const retry = results.some(({ error, rows }) => error !== undefined || rows === 0);
    // A turn that only removed boxes did exactly what it said, so asking would only add latency.
    const removedOnly = results.every(({ action, removedNodes }) => action.type === 'remove' && removedNodes > 0);
    if (!retry && removedOnly) {
      stop = 'done';
      break;
    }
    // A failed or empty action is worth another turn without asking; otherwise the judge decides.
    if (!retry) {
      if (!judge) {
        stop = 'done';
        break;
      }
      const done = yield* judge({ command, graph: describeGraph(graph), lastTurn: report }).pipe(
        Effect.tapError((error) => Effect.sync(() => log.info('judge failed', { error }))),
        Effect.orElseSucceed(() => 1),
      );
      turn.done = done;
      if (done >= DONE_THRESHOLD) {
        stop = 'judge';
        break;
      }
    }
    history.push(
      { role: 'assistant', content: JSON.stringify(step) },
      {
        role: 'user',
        content: `${report}\n\n${describeGraph(graph)}\n\nIf the command "${command}" is not yet done, act again; otherwise answer with no actions.`,
      },
    );
  }

  const results = turns.flatMap(({ results }) => results);
  return {
    message: turns.findLast(({ step }) => step.message.length > 0)?.step.message ?? '',
    turns,
    addedNodes: results.reduce((sum, { addedNodes }) => sum + addedNodes, 0),
    removedNodes: results.reduce((sum, { removedNodes }) => sum + removedNodes, 0),
    trailer: results.reduce<Budget.Trailer | undefined>(
      (trailer, result) => Budget.merge(trailer, result.trailer),
      undefined,
    ),
    stop,
  } satisfies Result;
});

/**
 * {@link run} with the command model and the default decision model from the AI service. Without a decision model
 * the command still runs, and stops after its first turn whose actions all succeed.
 */
export const runWithAiService = (graph: CodeGraph.CodeGraph, command: string, options: Omit<Options, 'judge'> = {}) =>
  Effect.gen(function* () {
    const judge = yield* resolveJudge;
    return yield* run(graph, command, { ...options, judge }).pipe(
      Effect.provide(AiService.languageModel(COMMAND_MODEL)),
    );
  });

const resolveJudge = Effect.gen(function* () {
  const context = yield* Layer.build(AiService.decisionModel(AiModel.defaultDecisionModel)).pipe(Effect.option);
  if (context._tag === 'None') {
    log.info('no decision model for code graph commands');
    return undefined;
  }
  return decisionJudge(yield* DecisionModel.DecisionModel.pipe(Effect.provide(context.value)));
}).pipe(Effect.scoped);

/** Carries out one action; a refused query or an over-full graph is reported to the model, not raised. */
const apply = (graph: CodeGraph.CodeGraph, action: Action, budget: number): Effect.Effect<ActionResult> =>
  Effect.gen(function* () {
    const empty = { action, addedNodes: 0, addedEdges: 0, removedNodes: 0 };
    switch (action.type) {
      case 'remove': {
        if (!action.filter) {
          return { ...empty, error: 'remove needs a filter' };
        }
        const ids = Filter.select(graph.nodes, action.filter).map(({ id }) => id);
        const summary = yield* removeNodes(graph, ids.length === graph.nodes.length ? undefined : ids);
        return { ...empty, removedNodes: summary.removedNodes };
      }
      case 'add': {
        if (!action.sparql) {
          return { ...empty, error: 'add needs a sparql query' };
        }
        const { rows } = yield* CodeIndexClient.query(action.sparql, QUERY_ROWS);
        const missing = Model.missing({ nodes: [...graph.nodes], edges: [...graph.edges] }, Model.fromRows(rows));
        const room = Math.min(budget, CodeGraph.MAX_NODES - graph.nodes.length);
        const { patch, trailer } = Budget.cap(graph.nodes, missing, room);
        const summary = yield* addPatch(graph, patch);
        return {
          ...empty,
          rows: rows.length,
          addedNodes: summary.addedNodes,
          addedEdges: summary.addedEdges,
          ...(trailer && { trailer }),
        };
      }
    }
  }).pipe(
    Effect.catch((error) =>
      Effect.succeed({
        action,
        addedNodes: 0,
        addedEdges: 0,
        removedNodes: 0,
        error: error instanceof Error ? error.message : String(error),
      }),
    ),
  );

/** The graph as the model sees it: counts, then one line per box, in shorthand. */
export const describeGraph = (graph: CodeGraph.CodeGraph): string => {
  if (graph.nodes.length === 0) {
    return 'The graph is empty.';
  }
  const kinds = new Map<string, number>();
  for (const { kind } of graph.nodes) {
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }
  const lines = graph.nodes.slice(0, LISTED_NODES).map(({ id, kind }) => `- ${Iri.compact(id)} (${kind})`);
  const more = graph.nodes.length > LISTED_NODES ? [`- … and ${graph.nodes.length - LISTED_NODES} more`] : [];
  return [
    `The graph has ${graph.nodes.length} boxes (${[...kinds].map(([kind, count]) => `${count} ${kind}`).join(', ')}) and ${graph.edges.length} arrows:`,
    ...lines,
    ...more,
  ].join('\n');
};

const describeResults = (results: readonly ActionResult[]): string =>
  results
    .map(({ action, rows, addedNodes, addedEdges, removedNodes, trailer, error }) => {
      const what = action.type === 'add' ? `add ${action.sparql}` : `remove ${action.filter}`;
      if (error) {
        return `${what}\n→ failed: ${error}`;
      }
      return action.type === 'add'
        ? `${what}\n→ ${rows} rows; added ${addedNodes} boxes and ${addedEdges} arrows.${trailer ? ` ${trailer.text}` : ''}`
        : `${what}\n→ removed ${removedNodes} boxes.`;
    })
    .join('\n\n');

const SYSTEM = trim`
  You change a graph of the codebase in response to one short command. Boxes are resources of a code index (an RDF
  graph): packages, files and symbols. Arrows are facts between them. Answer with a step: the actions to take now and
  one short sentence for the user. Prefer a single action that does the whole command. Never explain at length.

  You can do only two things:
  - \`add\`: run a SPARQL SELECT; each row becomes boxes and arrows on the graph. Rows with \`?from ?to\` (IRIs) become an
    arrow and both boxes; a row with \`?node\` becomes a box. Optional \`?label\` names a box. Large results are cut
    to the first boxes and the rest are summarised, so order rows with the most relevant first.
  - \`remove\`: remove boxes matching a filter: \`*\` for all, \`kind:file\`, \`/regex/\`, or plain text matched against
    labels, IRIs and packages (case-insensitive); \`|\` separates alternatives.

  To answer a question ("what depends on X?"), draw the answer. A question or a command that shows something ("show
  me …") replaces what is shown: start with \`remove *\` when the graph has boxes unrelated to it. A command that adds
  ("also …", "add …", "expand …") keeps them.

  ## The index

  Prefixes: \`deus:\` = <${Iri.DEUS}> (added for you when missing).
  - Packages: <${Iri.PACKAGE}NAME>, e.g. <${Iri.PACKAGE}@dxos/echo>. Shorthand \`pkg:@dxos/echo\` in the graph listing.
  - Files: <${Iri.FILE}REPO_PATH>. A symbol is its file's IRI plus \`#name\`. Shorthand \`file:REPO_PATH\`.
  - Package predicates: deus:name, deus:packagePath, deus:entry (package → the files its package.json exports),
    deus:usesPackage (package → package, from imports), deus:declaresDep (from package.json).
  - File predicates: deus:path, deus:publishedBy (file → package), deus:imports (file → file), deus:reexports
    (file → file), deus:declares (file → symbol).
  - Symbol predicates: deus:name, deus:canonicalName (as written by users, e.g. "Identity.Service", "Obj.update"),
    deus:kind (class, interface, type, variable, function, …), deus:exported, deus:packagePublic (exported by the
    package), deus:implDependsOn and deus:apiDependsOn (symbol → symbol it uses), deus:operationRequires (operation →
    service), deus:providesService (layer → service).
  - Symbol IRIs containing \`~\` or a \`/\` after the \`#\` are local references inside a symbol; filter them out with
    \`FILTER(!CONTAINS(STRAFTER(STR(?x), "#"), "~") && !CONTAINS(STRAFTER(STR(?x), "#"), "/"))\`.

  Match what the user names loosely (\`CONTAINS(LCASE(…), "…")\` on names and paths): "ECHO" is @dxos/echo
  (packages/core/echo/echo), "HALO" is identity and devices (packages/core/halo/*: @dxos/halo, credentials, keyring),
  "MESH" is networking (packages/core/mesh/*). A service is usually a class symbol named Service or …Service.

  Examples:
  \`\`\`sparql
  # The @dxos packages plugin-markdown depends on.
  SELECT ?from ?to WHERE {
    BIND(<${Iri.PACKAGE}@dxos/plugin-markdown> AS ?from)
    ?from deus:usesPackage ?to . ?to deus:name ?name . FILTER(STRSTARTS(?name, "@dxos/"))
  }
  # A package's exports: the modules its package.json exports, as arrows from the package.
  SELECT ?from ?to WHERE { BIND(<${Iri.PACKAGE}@dxos/echo> AS ?from) ?from deus:entry ?to . }
  # What depends on a symbol: find it by canonical name and path, then the symbols that use it.
  SELECT DISTINCT ?from ?to WHERE {
    ?to deus:canonicalName "Database.Service" ; deus:kind "class" .
    FILTER(CONTAINS(STR(?to), "/packages/core/echo/"))
    ?from deus:implDependsOn|deus:apiDependsOn|deus:operationRequires|deus:providesService ?to .
    FILTER(!CONTAINS(STRAFTER(STR(?from), "#"), "~") && !CONTAINS(STRAFTER(STR(?from), "#"), "/"))
  }
  # The files that import a file.
  SELECT ?from ?to WHERE { ?to deus:path "packages/core/echo/echo/src/Obj.ts" . ?from deus:imports ?to . }
  \`\`\`
`;

/** The operation's output: the result with each action reduced to one line. */
export const toOutput = (result: Result) => ({
  message: result.message,
  stop: result.stop,
  turns: result.turns.length,
  actions: result.turns.flatMap(({ results }) =>
    results.map(({ action, error }) => ({
      type: action.type,
      detail: (action.type === 'add' ? action.sparql : action.filter) ?? '',
      ...(error !== undefined && { error }),
    })),
  ),
  addedNodes: result.addedNodes,
  removedNodes: result.removedNodes,
  ...(result.trailer && { trailer: result.trailer.text }),
});
