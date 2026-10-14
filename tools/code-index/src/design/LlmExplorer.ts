//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import { createHash } from 'node:crypto';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Agent from '../workspace/Agent.ts';
import * as Docs from '../workspace/Docs.ts';
import * as Log from '../workspace/Log.ts';
import * as Explore from './Explore.ts';
import * as Graph from './Graph.ts';

/**
 * The LLM explorer: one workspace-agent turn with a recall-oriented system prompt. The model uses
 * the same sandbox as the chat (SPARQL over the index) to pick seed files and the relations worth
 * walking, and leaves its choice in project storage; the walk and the cards are the deterministic
 * explorer's, so an evaluation of the two compares judgement, not plumbing.
 */

/** The storage key the explorer's last snippet writes its choice to. */
export const RESULT_KEY = 'design.explore';

const RELATION_LIST = Graph.EDGE_KINDS.map((kind) => `- \`${kind}\`: ${Graph.EDGE_DESCRIPTIONS[kind]}`).join('\n');

export const systemPrompt = (): string =>
  [
    'You explore an RDF index of a TypeScript monorepo to collect the source files that could matter for',
    "answering a developer's question with a small architecture diagram. Favour RECALL: include anything",
    'plausibly relevant — a later stage prunes. You show nothing to the user.',
    '',
    'Your one tool, `exec`, runs TypeScript with these globals:',
    '',
    '```ts',
    Docs.api(),
    '```',
    '',
    'Files are `https://dxos.org/deus/file/<repo path>`; a symbol is its file IRI plus `#<name>`. Useful',
    'predicates: `deus:path`, `deus:declares` (file → symbol), `deus:name`, `deus:doc`, `deus:canonicalName`',
    "(only on a namespaced module's identifiers, so read `COALESCE(?canonical, ?name)`),",
    '`deus:inPackage` (file → package), and on packages `deus:name`, `deus:packagePath`. Classes include',
    '`deus:EffectService`, `deus:EffectLayer`, `deus:Operation`, `deus:Plugin`, `deus:Capability`.',
    'Always use LIMIT; text filters look like',
    "`FILTER(CONTAINS(LCASE(?name), 'runtime'))`.",
    '',
    'Example — exported declarations whose name mentions a word, with their files:',
    '```ts',
    'const rows = await rdf.query(`PREFIX deus: <https://dxos.org/vocab/deus#>',
    '  SELECT ?file ?name WHERE { ?file deus:declares ?s . ?s deus:exported true ; deus:name ?name .',
    "    FILTER(CONTAINS(LCASE(?name), 'agent')) } LIMIT 50`);",
    'print(rows);',
    '```',
    '',
    'The relations a later walk can follow from your seeds:',
    RELATION_LIST,
    '',
    'Work in a few steps: search names, docs and paths for the concepts in the question; look at what you',
    'find; then FINISH with one exec that records your choice, exactly like this:',
    '```ts',
    `await storage.set('${RESULT_KEY}', {`,
    "  seeds: [{ iri: 'https://dxos.org/deus/file/packages/…/X.ts', why: 'declares the X service' }],",
    "  relations: ['imports', 'providesService'],",
    '  hops: 2,',
    '});',
    '```',
    'Give 5–25 seed files (file IRIs, not symbols), the relations that explain the answer, and hops 1 or 2.',
    'Then reply with one sentence.',
  ].join('\n');

type Choice = {
  readonly seeds: readonly { readonly iri: string; readonly why?: string }[];
  readonly relations: readonly string[];
  readonly hops: number;
};

const isEdgeKind = (value: string): value is Graph.EdgeKind => Graph.EDGE_KINDS.some((kind) => kind === value);

/** Reads the model's choice defensively: the snippet that wrote it is model-authored. */
const parseChoice = (raw: string | undefined): Choice | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('seeds' in value) || !Array.isArray(value.seeds)) {
      return undefined;
    }
    const seeds = value.seeds.flatMap((seed: unknown) =>
      typeof seed === 'string'
        ? [{ iri: seed }]
        : typeof seed === 'object' && seed !== null && 'iri' in seed && typeof seed.iri === 'string'
          ? [{ iri: seed.iri, why: 'why' in seed && typeof seed.why === 'string' ? seed.why : undefined }]
          : [],
    );
    const relations =
      'relations' in value && Array.isArray(value.relations)
        ? value.relations.filter((relation: unknown): relation is string => typeof relation === 'string')
        : [];
    const hops = 'hops' in value && value.hops === 1 ? 1 : 2;
    return { seeds, relations, hops };
  } catch {
    return undefined;
  }
};

export type LlmExploreOptions = {
  readonly prompt: string;
  readonly maxNodes?: number;
};

/**
 * Runs the explorer turn and walks from what it chose. A model that never records a choice yields
 * an explorer error rather than an empty graph, so the evaluation counts it as a failure honestly.
 */
export const explore = ({ prompt, maxNodes = 300 }: LlmExploreOptions) =>
  Effect.gen(function* () {
    const agent = yield* Agent.Agent;
    const log = yield* Log.Log;
    const store = yield* Store.Store;
    const id = `design-${createHash('sha256').update(`${prompt}\u0000${Date.now()}`).digest('hex').slice(0, 12)}`;
    const project = yield* log.createProject({ id });
    yield* agent.turn({ projectId: project.id, text: prompt, system: systemPrompt() });
    const choice = parseChoice(yield* log.getValue(project.id, RESULT_KEY));
    if (!choice || choice.seeds.length === 0) {
      return yield* Effect.fail(
        new Agent.AgentError({ message: `The explorer turn recorded no seeds (project ${project.id}).` }),
      );
    }
    const seeds = choice.seeds
      .map((seed) => ({ iri: Graph.fileOfSymbol(seed.iri), score: 1, why: seed.why ?? 'chosen by the explorer' }))
      .filter(
        (seed) =>
          seed.iri.startsWith(Ontology.FILE_BASE) &&
          Explore.isComponentPath(Graph.pathOf(seed.iri, Ontology.FILE_BASE)),
      );
    if (seeds.length === 0) {
      return yield* Effect.fail(
        new Agent.AgentError({ message: `The explorer turn recorded no usable seeds (project ${project.id}).` }),
      );
    }
    const relations = choice.relations.filter(isEdgeKind);
    return yield* Explore.fromSeeds(store, {
      prompt,
      explorer: 'llm',
      seeds,
      maxNodes,
      hops: choice.hops,
      relations: relations.length > 0 ? relations : Explore.DEFAULT_RELATIONS,
    });
  });
