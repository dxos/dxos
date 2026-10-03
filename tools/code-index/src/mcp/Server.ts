//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as McpProtocol from 'effect/ai/McpProtocol';
import * as McpServer from 'effect/ai/McpServer';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { join } from 'node:path';

import * as Cache from '../design/Cache.ts';
import * as Design from '../design/Design.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Summary from '../Summary.ts';
import * as Term from '../worker/types/Term.ts';
import * as Lock from './Lock.ts';
import * as Terms from './Terms.ts';

/**
 * `code-index mcp`: a read-only MCP server over stdio, so an MCP client can query the index the
 * way the workspace agent does. It opens an existing store and never indexes or writes.
 */

/** The namespaces of `design/ONTOLOGY.md`; a query using one without declaring it gets the declaration. */
export const NAMESPACES: Readonly<Record<string, string>> = {
  deus: Ontology.PREFIX,
  file: Ontology.FILE_BASE,
  pkg: Ontology.PACKAGE_BASE,
  module: Ontology.MODULE_BASE,
  graph: Ontology.GRAPH_BASE,
  type: Ontology.TYPE_BASE,
  lib: Term.LIB_BASE,
  rdf: Ontology.prefixes.rdf,
  rdfs: Ontology.prefixes.rdfs,
  xsd: Ontology.prefixes.xsd,
};

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

export const QUERY_DEFAULT_LIMIT = 200;
export const QUERY_MAX_LIMIT = 2_000;
export const QUERY_DEFAULT_TIMEOUT_MS = 30_000;
export const QUERY_MAX_TIMEOUT_MS = 120_000;
export const DESCRIBE_DEFAULT_LIMIT = 50;
export const DESCRIBE_MAX_LIMIT = 500;
export const FILES_DEFAULT_LIMIT = 500;
export const FILES_MAX_LIMIT = 5_000;
export const DESIGN_DEFAULT_BUDGET = 30;
export const DESIGN_MAX_BUDGET = 200;

/** Candidates listed when a name matches several resources, rather than describing one at random. */
export const MAX_CANDIDATES = 20;

/** Matches fetched to rank before the candidate cap; past this the total is reported as a lower bound. */
const MAX_MATCHES = 500;

const clamp = (value: number | undefined, fallback: number, max: number): number =>
  Math.min(Math.max(1, Math.floor(value ?? fallback)), max);

/**
 * Bounds a SELECT at the store: the backends materialise every row, so an unbounded query against
 * millions of quads must be cut off by the engine, not by slicing afterwards. A trailing LIMIT is
 * lowered to the cap; with none, one is appended on its own line so a trailing comment cannot
 * swallow it.
 */
export const boundQuery = (sparql: string, limit: number): string => {
  const trailing = /((?:\s+(?:LIMIT|OFFSET)\s+\d+)+)\s*$/i.exec(sparql);
  const modifiers = trailing?.[1] ?? '';
  if (!/LIMIT/i.test(modifiers)) {
    return `${sparql}\nLIMIT ${limit}`;
  }
  const lowered = modifiers.replace(/LIMIT\s+(\d+)/i, (_, value: string) => `LIMIT ${Math.min(Number(value), limit)}`);
  return `${sparql.slice(0, trailing?.index ?? sparql.length)}${lowered}`;
};

/** Only names SPARQL accepts as a prefixed name's local part are compacted, so output pastes back into a query. */
const LOCAL_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export const compact = (iri: string): string => {
  for (const [prefix, base] of Object.entries(NAMESPACES)) {
    if (iri.startsWith(base) && LOCAL_NAME.test(iri.slice(base.length))) {
      return `${prefix}:${iri.slice(base.length)}`;
    }
  }
  return iri;
};

/** A full IRI, `<…>` or a `prefix:` name over {@link NAMESPACES}; anything else is a name to resolve. */
export const expand = (target: string): string | undefined => {
  const trimmed = target.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1);
  }
  if (/^(https?|urn):/.test(trimmed)) {
    return trimmed;
  }
  const colon = trimmed.indexOf(':');
  if (colon > 0) {
    const base = NAMESPACES[trimmed.slice(0, colon)];
    if (base !== undefined) {
      return `${base}${trimmed.slice(colon + 1)}`;
    }
  }
  return undefined;
};

/** A SPARQL string literal; JSON's escapes are a subset of SPARQL's. */
const literal = (value: string): string => JSON.stringify(value);

const INVALID_IRI = /[<>"{}|^`\\\s]/;

//
// Query preprocessing.
//

/**
 * The query with string literals, IRIs and comments blanked, so a scan for prefixed names sees only
 * syntax: `"deus:x"` and `<urn:deus:x>` are not uses of the `deus:` prefix.
 */
const syntaxOnly = (sparql: string): string =>
  sparql
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, ' ')
    .replace(/<[^<>"{}|^`\\\s]*>/g, ' ')
    .replace(/#[^\n]*/g, ' ');

/**
 * Prepends a PREFIX declaration for every {@link NAMESPACES} prefix the query uses without
 * declaring, which is the most common reason an agent's first query fails to parse.
 */
export const withPrefixes = (sparql: string): { readonly sparql: string; readonly injected: readonly string[] } => {
  const syntax = syntaxOnly(sparql);
  const declared = new Set([...syntax.matchAll(/PREFIX\s+([A-Za-z][\w.-]*)?\s*:/gi)].map((match) => match[1] ?? ''));
  const used = new Set([...syntax.matchAll(/(?<![\w?$:.-])([A-Za-z][\w-]*):/g)].map((match) => match[1]));
  const injected = [...used].filter((prefix) => !declared.has(prefix) && NAMESPACES[prefix] !== undefined).sort();
  if (injected.length === 0) {
    return { sparql, injected };
  }
  const declarations = injected.map((prefix) => `PREFIX ${prefix}: <${NAMESPACES[prefix]}>`).join('\n');
  return { sparql: `${declarations}\n${sparql}`, injected };
};

/** The `deus:` local names a query mentions, prefixed or as full IRIs. */
export const deusTerms = (sparql: string): string[] => {
  const prefixed = [...syntaxOnly(sparql).matchAll(/(?<![\w?$:.-])deus:([A-Za-z_][\w-]*)/g)].map((match) => match[1]);
  const escaped = Ontology.PREFIX.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const full = [...sparql.matchAll(new RegExp(`<${escaped}([A-Za-z_][\\w-]*)>`, 'g'))].map((match) => match[1]);
  return [...new Set([...prefixed, ...full])];
};

/** A warning per `deus:` term the vocabulary lacks, naming the closest known ones — a typo otherwise returns `[]`. */
export const unknownTermWarnings = (sparql: string, known: ReadonlySet<string>): string[] =>
  deusTerms(sparql)
    .filter((term) => !known.has(term))
    .map((term) => {
      const near = Terms.closest(term, known);
      return near.length > 0
        ? `deus:${term} is not in the vocabulary; did you mean ${near.map((name) => `deus:${name}`).join(', ')}?`
        : `deus:${term} is not in the vocabulary; call \`vocabulary\` for the terms that exist.`;
    });

const timeoutMessage = (ms: number): string =>
  `The query timed out after ${ms} ms and was cancelled. Narrow it: bind the subject or the predicate, add a ` +
  'LIMIT, and avoid unbounded property paths such as (a|b)* or ?x deus:imports+ ?y from an unbound subject. ' +
  `A larger timeoutMs (up to ${QUERY_MAX_TIMEOUT_MS}) is the last resort.`;

//
// Tools.
//

/** A declared failure, so the client receives an `isError` result carrying the message. */
export class ToolFailure extends Schema.TaggedError<ToolFailure>()('ToolFailure', {
  message: Schema.String,
}) {}

const toFailure = (error: { readonly message: string }): ToolFailure => new ToolFailure({ message: error.message });

/** The index is local and read-only: no tool changes anything or reaches outside the store. */
const readOnly = <
  Name extends string,
  Config extends {
    readonly parameters: Schema.Constraint;
    readonly success: Schema.Constraint;
    readonly failure: Schema.Constraint;
    readonly failureMode: Tool.FailureMode;
  },
>(
  tool: Tool.Tool<Name, Config>,
): Tool.Tool<Name, Config> =>
  tool
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.Idempotent, true)
    .annotate(Tool.OpenWorld, false);

/** Integers only: `Schema.Number` would advertise `"Infinity"` and `"NaN"` strings in the JSON schema. */
const count = (description: string) => Schema.optional(Schema.Int.annotate({ description }));

const Row = Schema.Record(Schema.String, Schema.String);

const Warnings = Schema.optional(
  Schema.Array(Schema.String).annotate({ description: 'Unknown deus: terms, with the closest known ones.' }),
);

const PrefixesInjected = Schema.optional(
  Schema.Array(Schema.String).annotate({ description: 'Prefixes the query used without declaring, which were added.' }),
);

const TimeoutMs = count(
  `Cancel the query after this many milliseconds (default ${QUERY_DEFAULT_TIMEOUT_MS}, max ${QUERY_MAX_TIMEOUT_MS}).`,
);

export const Query = readOnly(
  Tool.make('query', {
    description:
      'Runs a SPARQL SELECT over the code index and returns { vars, rows }: each row maps a variable to its ' +
      'lexical value, and unbound variables are absent. Rows are capped at `limit` (default 200, max 2000) and ' +
      '`truncated` says whether more existed. A query is cancelled after `timeoutMs` (default 30 s). The known ' +
      'prefixes (see the server instructions) are declared automatically when a query omits them, and ' +
      '`warnings` names any deus: term the vocabulary lacks. Call `vocabulary` first for the classes and ' +
      'predicates. Example — the operations of a package and their keys: SELECT ?op ?key WHERE { ?op a ' +
      'deus:Operation ; deus:operationKey ?key ; ^deus:declares/deus:inPackage pkg:@dxos/plugin-markdown }',
    parameters: Schema.Struct({
      sparql: Schema.String.annotate({ description: 'A SPARQL SELECT query.' }),
      limit: count(`Maximum rows to return (default ${QUERY_DEFAULT_LIMIT}, max ${QUERY_MAX_LIMIT}).`),
      timeoutMs: TimeoutMs,
    }),
    success: Schema.Struct({
      vars: Schema.Array(Schema.String),
      rows: Schema.Array(Row),
      limit: Schema.Number,
      truncated: Schema.Boolean,
      prefixesInjected: PrefixesInjected,
      warnings: Warnings,
    }),
    failure: ToolFailure,
  }),
);

export const Ask = readOnly(
  Tool.make('ask', {
    description:
      'Runs a SPARQL ASK over the code index and returns { result: boolean }, with the same prefix ' +
      'declaration, `warnings` and `timeoutMs` as `query`. Example — does any non-test file import a test ' +
      'file? ASK { ?a deus:importsTestFile ?b }',
    parameters: Schema.Struct({
      sparql: Schema.String.annotate({ description: 'A SPARQL ASK query.' }),
      timeoutMs: TimeoutMs,
    }),
    success: Schema.Struct({ result: Schema.Boolean, prefixesInjected: PrefixesInjected, warnings: Warnings }),
    failure: ToolFailure,
  }),
);

const VocabularyTerm = Schema.Struct({
  term: Schema.String.annotate({ description: 'Local name in the deus: namespace, e.g. File or imports.' }),
  kind: Schema.Literals(['class', 'property']).annotate({ description: 'class (used with rdf:type) or property.' }),
  count: Schema.Number.annotate({ description: 'Quads using it; 0 for a documented term this graph never states.' }),
  description: Schema.optional(Schema.String),
  subjectClass: Schema.optional(
    Schema.String.annotate({ description: "A property's subject class, or the class a class refines." }),
  ),
  range: Schema.optional(Schema.String.annotate({ description: "A property's object class or datatype." })),
  documented: Schema.Boolean.annotate({ description: 'Whether design/ONTOLOGY.md documents it.' }),
});

export const Vocabulary = readOnly(
  Tool.make('vocabulary', {
    description:
      'Lists the deus: classes and predicates: every documented term with its meaning, subject class and ' +
      'range, and how many quads use it (count 0 when this graph never states it — a query on it returns ' +
      'nothing), plus any undocumented term the graph contains, and the namespace prefixes. Terms concluded ' +
      'by the N3 rules (EffectLayer, providesService, operationKey, …) are included. Read this before writing ' +
      'SPARQL rather than guessing predicate names. Example follow-up: SELECT ?layer ?service WHERE { ?layer ' +
      'a deus:EffectLayer ; deus:providesService ?service } LIMIT 10',
    parameters: Tool.EmptyParams,
    success: Schema.Struct({
      prefixes: Schema.Record(Schema.String, Schema.String),
      terms: Schema.Array(VocabularyTerm),
    }),
    failure: ToolFailure,
  }),
);

const Outgoing = Schema.Struct({
  predicate: Schema.String,
  object: Schema.String,
  objectKind: Schema.Literals(['iri', 'literal']),
});

const Incoming = Schema.Struct({ subject: Schema.String, predicate: Schema.String });

const PredicateCount = Schema.Struct({ predicate: Schema.String, count: Schema.Number });

const Candidate = Schema.Struct({
  iri: Schema.String,
  types: Schema.Array(Schema.String),
  matchedBy: Schema.String.annotate({
    description: 'How the target matched: iri, path, name, canonicalName, operationKey, …; partial: for a near match.',
  }),
});

/** Every form `describe` resolves, for the hint a miss returns. */
export const DESCRIBE_FORMS =
  'Accepted forms: an IRI (full, <…>, or deus:/file:/pkg:/module: prefixed); a repository-relative file path, ' +
  'or its tail (src/Store.ts); a package name (@dxos/echo); a symbol name (layer) or canonical name ' +
  '(Operation.make); an operation key (org.dxos.operation.markdown.create); an ECHO typename ' +
  '(org.dxos.type.document); a plugin id (org.dxos.plugin.markdown); a .mdl spec id; a module member as ' +
  'imported (effect/Layer#effect, @dxos/echo#Type.Obj); or a symbol as <path>#<name>.';

export const Describe = readOnly(
  Tool.make('describe', {
    description:
      'Shows one resource of the code index: its outgoing triples (predicate, object) capped at `limit` ' +
      '(default 50, max 500), its incoming triples spread across predicates within the same cap, and ' +
      '`incomingCounts`, the number of incoming triples per predicate. `target` is an IRI or a name; see the ' +
      '`target` parameter for every form. An exact match is preferred to a partial one, and package-public ' +
      'and exported symbols rank first; several equally good matches come back as `candidates` (capped at 20, ' +
      'with `candidatesTotal`) to describe one by IRI. No match returns a `hint`. Example: { "target": ' +
      '"Operation.make" } or { "target": "org.dxos.operation.markdown.create" }.',
    parameters: Schema.Struct({
      target: Schema.String.annotate({ description: DESCRIBE_FORMS }),
      limit: count(`Maximum triples per direction (default ${DESCRIBE_DEFAULT_LIMIT}, max ${DESCRIBE_MAX_LIMIT}).`),
    }),
    success: Schema.Struct({
      iri: Schema.optional(Schema.String),
      resolvedBy: Schema.optional(Schema.String),
      candidates: Schema.Array(Candidate),
      candidatesTotal: Schema.Number.annotate({ description: `Matches found, counted up to ${MAX_MATCHES}.` }),
      outgoing: Schema.Array(Outgoing),
      incoming: Schema.Array(Incoming),
      incomingCounts: Schema.Array(PredicateCount),
      truncated: Schema.Struct({ outgoing: Schema.Boolean, incoming: Schema.Boolean, candidates: Schema.Boolean }),
      hint: Schema.optional(Schema.String),
    }),
    failure: ToolFailure,
  }),
);

const FileEntry = Schema.Struct({ path: Schema.String, language: Schema.String, size: Schema.Number });

export const Files = readOnly(
  Tool.make('files', {
    description:
      'Lists indexed files (repository-relative paths) with their language and size, optionally filtered by a ' +
      'path prefix and a language (typescript, json, markdown, mdl, …), capped at `limit` (default 500, max ' +
      '5000). A file path p has the IRI file:p. Example: { "prefix": "packages/plugins/plugin-markdown/src/", ' +
      '"language": "typescript" }',
    parameters: Schema.Struct({
      prefix: Schema.optional(Schema.String.annotate({ description: 'Keep paths starting with this.' })),
      language: Schema.optional(Schema.String.annotate({ description: 'Keep files of this language.' })),
      limit: count(`Maximum files to return (default ${FILES_DEFAULT_LIMIT}, max ${FILES_MAX_LIMIT}).`),
    }),
    success: Schema.Struct({
      files: Schema.Array(FileEntry),
      total: Schema.Number.annotate({ description: 'Files matching the filters, before the limit.' }),
      truncated: Schema.Boolean,
    }),
    failure: ToolFailure,
  }),
);

const DerivedGraph = Schema.Struct({
  graph: Schema.String.annotate({ description: 'The graph IRI; graph:derived/<rules file> or graph:pass/<pass>.' }),
  quads: Schema.Number,
});

export const Stats = readOnly(
  Tool.make('stats', {
    description:
      'Reports the size of the code index: indexed files, total quads, the quads each reasoner derived (one ' +
      'graph per rules file under graph:derived/ and per JS pass under graph:pass/), and the backend in use ' +
      '(js or native). Example follow-up — what one rules file concludes: SELECT ?p (COUNT(*) AS ?n) WHERE { ' +
      'GRAPH <https://dxos.org/deus/graph/derived/30-compute> { ?s ?p ?o } } GROUP BY ?p',
    parameters: Tool.EmptyParams,
    success: Schema.Struct({
      backend: Schema.String,
      dir: Schema.String,
      files: Schema.Number,
      quads: Schema.Number,
      derived: Schema.Array(DerivedGraph),
    }),
    failure: ToolFailure,
  }),
);

export const DesignTool = readOnly(
  Tool.make('design', {
    description:
      'Answers a design question with the files that matter and how they connect: explores the index from the ' +
      "prompt, scores every candidate file's relevance (System One blended with a text/degree baseline when the " +
      'server has TYPESAFE_API_KEY, the baseline alone otherwise), prunes to `budget` files (default 30) and ' +
      'returns them best first with their edges, plus a compact mermaid draft of at most 14 boxes with a ' +
      '`%% ref <id> <path>` line per box. Takes a few seconds. Example: { "prompt": "how does the agent runtime ' +
      'wire its services?" }',
    parameters: Schema.Struct({
      prompt: Schema.String.annotate({ description: 'The design question, in prose.' }),
      budget: count(`Files to keep (default ${DESIGN_DEFAULT_BUDGET}, max ${DESIGN_MAX_BUDGET}).`),
      threshold: Schema.optional(Schema.Finite.annotate({ description: 'Relevance a file needs, 0–1 (default 0.3).' })),
    }),
    success: Schema.Struct({
      scorer: Schema.String,
      grouping: Schema.String,
      nodes: Schema.Array(
        Schema.Struct({
          iri: Schema.String,
          label: Schema.String,
          kind: Schema.String,
          path: Schema.String,
          package: Schema.optional(Schema.String),
          score: Schema.Number,
        }),
      ),
      edges: Schema.Array(Schema.Struct({ from: Schema.String, to: Schema.String, kind: Schema.String })),
      mermaid: Schema.String,
    }),
    failure: ToolFailure,
  }),
);

export const CodeIndexToolkit = Toolkit.make(Query, Ask, Vocabulary, Describe, Files, Stats, DesignTool);

//
// Name resolution.
//

/** Literal-valued keys a `describe` target may be, strongest first; the order is the ranking. */
const EXACT_KEYS = ['path', 'canonicalName', 'operationKey', 'echoTypename', 'pluginId', 'specId', 'name'] as const;

/** Classes an agent is most likely to mean, so a symbol outranks a type term's property of the same name. */
const PRIMARY_CLASSES = [Ontology.Symbol, Ontology.Package, Ontology.File, Ontology.SpecBlock].map(
  (node) => node.value,
);

/** `Namespace.member`, whose last segment is worth trying as a bare name. */
const DOTTED_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/;

const FILE_EXTENSION = /\.(?:[cm]?[jt]sx?|json|ya?ml|mdl?|n3)$/;

type Match = {
  readonly iri: string;
  readonly matchedBy: string;
  readonly tier: number;
  readonly packagePublic: boolean;
  readonly exported: boolean;
  readonly primary: boolean;
};

const rank = (left: Match, right: Match): number =>
  left.tier - right.tier ||
  Number(right.packagePublic) - Number(left.packagePublic) ||
  Number(right.exported) - Number(left.exported) ||
  Number(right.primary) - Number(left.primary) ||
  left.iri.localeCompare(right.iri);

/** The ranking facts of each subject a pattern binds to `?s`, one row per subject and match. */
const matchQuery = (patterns: string): string => `${DEUS}
  SELECT ?s ?how (SAMPLE(?pub) AS ?public) (SAMPLE(?exp) AS ?exported) (SAMPLE(?cls) AS ?primary) WHERE {
    ${patterns}
    OPTIONAL { ?s deus:packagePublic ?pub }
    OPTIONAL { ?s deus:exported ?exp }
    OPTIONAL { ?s a ?cls FILTER(?cls IN (${PRIMARY_CLASSES.map((iri) => `<${iri}>`).join(', ')})) }
  } GROUP BY ?s ?how LIMIT ${MAX_MATCHES}`;

const toMatches = (rows: readonly Store.Binding[], tierOf: (how: string) => number): Match[] =>
  rows.map((row) => ({
    iri: row.s,
    matchedBy: row.how,
    tier: tierOf(row.how),
    packagePublic: row.public === 'true',
    exported: row.exported === 'true',
    primary: row.primary !== undefined,
  }));

/** One match per IRI, its best. */
const best = (matches: readonly Match[]): Match[] => {
  const byIri = new Map<string, Match>();
  for (const match of [...matches].sort(rank)) {
    if (!byIri.has(match.iri)) {
      byIri.set(match.iri, match);
    }
  }
  return [...byIri.values()];
};

/**
 * A term's documented fields with absent ones left out rather than `undefined`: MCP validates
 * `structuredContent` as JSON, which has no `undefined`.
 */
const meaning = (term: Terms.Term | undefined) => ({
  ...(term === undefined ? {} : { description: term.description }),
  ...(term?.subjectClass === undefined ? {} : { subjectClass: term.subjectClass }),
  ...(term?.range === undefined ? {} : { range: term.range }),
});

//
// Handlers.
//

export const handlers = (store: Store.Api) =>
  Effect.gen(function* () {
    // Recorded by the last indexing pass when current; otherwise a whole-graph scan, paid once per process.
    const summary = yield* Effect.cached(Summary.load(store));
    const recorded = yield* Summary.read(store).pipe(Effect.orElseSucceed(() => undefined));

    // What a query may name without a warning: the documented terms, and whatever the graph states.
    const known = new Set([...Object.keys(Terms.TERMS), ...(recorded?.vocabulary ?? []).map((entry) => entry.term)]);

    // Opened on first use; the answers it holds are the design cache, not the (read-only) store.
    const designCache = yield* Effect.cached(Cache.open(join(store.dir, 'design-cache.jsonl')));

    /**
     * Bounds a store call by the caller's timeout. Interruption reaches the native evaluator, which
     * stops at its next quad read; the JS backend's evaluation is abandoned to finish on its own.
     */
    const bounded = <A>(effect: Effect.Effect<A, Store.StoreError>, timeoutMs: number | undefined) => {
      const ms = clamp(timeoutMs, QUERY_DEFAULT_TIMEOUT_MS, QUERY_MAX_TIMEOUT_MS);
      return effect.pipe(
        Effect.mapError(toFailure),
        Effect.timeoutOrElse({
          duration: Duration.millis(ms),
          orElse: () => Effect.fail(new ToolFailure({ message: timeoutMessage(ms) })),
        }),
      );
    };

    /** Prefixes declared and unknown terms flagged, as fields omitted when there is nothing to say. */
    const prepare = (sparql: string) => {
      const prepared = withPrefixes(sparql);
      const warnings = unknownTermWarnings(sparql, known);
      return {
        sparql: prepared.sparql,
        notes: {
          ...(prepared.injected.length > 0 ? { prefixesInjected: prepared.injected } : {}),
          ...(warnings.length > 0 ? { warnings } : {}),
        },
      };
    };

    const exists = (iri: string) =>
      INVALID_IRI.test(iri) ? Effect.succeed(false) : store.ask(`ASK { { <${iri}> ?p ?o } UNION { ?s ?p <${iri}> } }`);

    const resolve = (target: string) =>
      Effect.gen(function* () {
        const trimmed = target.trim();
        const iri = expand(trimmed);
        if (iri !== undefined) {
          return [{ iri, matchedBy: 'iri', tier: 0, packagePublic: false, exported: false, primary: true }];
        }

        // `effect/Layer#effect` is a member as imported; `src/Store.ts#layer` a symbol by its file.
        if (trimmed.includes('#') && !INVALID_IRI.test(trimmed)) {
          const forms = [
            { iri: `${Ontology.MODULE_BASE}${trimmed}`, matchedBy: 'member' },
            { iri: `${Ontology.FILE_BASE}${trimmed}`, matchedBy: 'symbol' },
          ];
          const found = yield* Effect.filter(forms, (form) => exists(form.iri));
          if (found.length > 0) {
            return found.map((form) => ({ ...form, tier: 0, packagePublic: false, exported: false, primary: true }));
          }
        }

        const value = literal(trimmed);
        const exact = yield* store.select(
          matchQuery(
            EXACT_KEYS.map((key) => `{ ?s deus:${key} ${value} BIND(${literal(key)} AS ?how) }`).join(' UNION '),
          ),
        );
        if (exact.length > 0) {
          return best(toMatches(exact, (how) => EXACT_KEYS.findIndex((key) => key === how)));
        }

        // Partial: the last segment of a dotted name (not of a file name), or a path's tail.
        const dotted = DOTTED_NAME.test(trimmed) && !FILE_EXTENSION.test(trimmed);
        const segment = trimmed.split('.').pop() ?? trimmed;
        const partial = yield* store.select(
          matchQuery(
            [
              ...(dotted ? [`{ ?s deus:name ${literal(segment)} BIND("partial:name" AS ?how) }`] : []),
              `{ ?s deus:path ?path FILTER(STRENDS(?path, ${literal(`/${trimmed}`)})) BIND("partial:path" AS ?how) }`,
            ].join(' UNION '),
          ),
        );
        return best(toMatches(partial, () => EXACT_KEYS.length));
      });

    const typesOf = (iri: string) =>
      Effect.map(store.select(`SELECT DISTINCT ?type WHERE { <${iri}> a ?type } ORDER BY ?type`), (rows) =>
        rows.map((row) => compact(row.type)),
      );

    /** Incoming triples spread over their predicates, so a few thousand of one kind cannot hide every other kind. */
    const incomingOf = (iri: string, cap: number) =>
      Effect.gen(function* () {
        const counted = yield* store.select(
          `SELECT ?p (COUNT(?s) AS ?n) WHERE { ?s ?p <${iri}> } GROUP BY ?p ORDER BY DESC(?n) ?p`,
        );
        const counts = counted.map((row) => ({ predicate: row.p, count: Number(row.n) }));
        const share = Math.max(1, Math.ceil(cap / Math.max(1, counts.length)));
        const rows = yield* Effect.forEach(counts, ({ predicate }) =>
          store
            .select(`SELECT ?s WHERE { ?s <${predicate}> <${iri}> } ORDER BY ?s LIMIT ${share}`)
            .pipe(
              Effect.map((subjects) =>
                subjects.map((row) => ({ subject: compact(row.s), predicate: compact(predicate) })),
              ),
            ),
        );
        const incoming = rows.flat().slice(0, cap);
        const total = counts.reduce((sum, entry) => sum + entry.count, 0);
        return {
          incoming,
          incomingCounts: counts.map((entry) => ({ predicate: compact(entry.predicate), count: entry.count })),
          truncated: total > incoming.length,
        };
      });

    const candidatesOf = (matches: readonly Match[]) =>
      Effect.forEach(matches.slice(0, MAX_CANDIDATES), (match) =>
        Effect.map(typesOf(match.iri), (types) => ({ iri: match.iri, types, matchedBy: match.matchedBy })),
      );

    return CodeIndexToolkit.of({
      query: ({ sparql, limit, timeoutMs }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, QUERY_DEFAULT_LIMIT, QUERY_MAX_LIMIT);
          const prepared = prepare(sparql);
          // One row past the cap is what tells a full page from a truncated one.
          const rows = yield* bounded(store.select(boundQuery(prepared.sparql, cap + 1)), timeoutMs);
          const vars = [...new Set(rows.flatMap((row) => Object.keys(row)))];
          return { vars, rows: rows.slice(0, cap), limit: cap, truncated: rows.length > cap, ...prepared.notes };
        }),

      ask: ({ sparql, timeoutMs }) =>
        Effect.gen(function* () {
          const prepared = prepare(sparql);
          const result = yield* bounded(store.ask(prepared.sparql), timeoutMs);
          return { result, ...prepared.notes };
        }),

      vocabulary: () =>
        summary.pipe(
          Effect.map(({ vocabulary }) => {
            const stated = vocabulary.map((entry) => {
              const documented = Terms.TERMS[entry.term];
              return { ...entry, documented: documented !== undefined, ...meaning(documented) };
            });
            const present = new Set(vocabulary.map((entry) => entry.term));
            const absent = Object.entries(Terms.TERMS)
              .filter(([term]) => !present.has(term))
              .map(([term, documented]) => ({
                term,
                kind: documented.kind,
                count: 0,
                documented: true,
                ...meaning(documented),
              }));
            const terms = [...stated, ...absent].sort(
              (left, right) =>
                left.kind.localeCompare(right.kind) || right.count - left.count || left.term.localeCompare(right.term),
            );
            return { prefixes: { ...NAMESPACES }, terms };
          }),
          Effect.mapError(toFailure),
        ),

      describe: ({ target, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, DESCRIBE_DEFAULT_LIMIT, DESCRIBE_MAX_LIMIT);
          const matches = yield* resolve(target);
          const empty = { outgoing: [], incoming: [], incomingCounts: [] };
          const total = matches.length;
          const truncatedCandidates = total > MAX_CANDIDATES;
          if (total === 0) {
            return {
              candidates: [],
              candidatesTotal: 0,
              ...empty,
              truncated: { outgoing: false, incoming: false, candidates: false },
              hint: `Nothing matched ${JSON.stringify(target)}. ${DESCRIBE_FORMS} An external symbol is a module member, e.g. effect/sql/SqlClient#SqlClient.`,
            };
          }
          // Described when one match is better than every other; otherwise the client picks.
          const [first, second] = matches;
          if (second !== undefined && second.tier === first.tier) {
            return {
              candidates: yield* candidatesOf(matches),
              candidatesTotal: total,
              ...empty,
              truncated: { outgoing: false, incoming: false, candidates: truncatedCandidates },
            };
          }
          const iri = first.iri;
          if (INVALID_IRI.test(iri)) {
            return yield* Effect.fail(new ToolFailure({ message: `Not a valid IRI: ${iri}` }));
          }
          const outgoing = yield* store.select(
            `SELECT ?p ?o (isIRI(?o) AS ?iri) WHERE { <${iri}> ?p ?o } ORDER BY ?p ?o LIMIT ${cap + 1}`,
          );
          const incoming = yield* incomingOf(iri, cap);
          const others = matches.slice(1);
          return {
            iri,
            resolvedBy: first.matchedBy,
            candidates: yield* candidatesOf(others),
            candidatesTotal: others.length,
            outgoing: outgoing.slice(0, cap).map((row) => {
              const isIri = row.iri === 'true';
              return {
                predicate: compact(row.p),
                object: isIri ? compact(row.o) : row.o,
                objectKind: isIri ? ('iri' as const) : ('literal' as const),
              };
            }),
            incoming: incoming.incoming,
            incomingCounts: incoming.incomingCounts,
            truncated: {
              outgoing: outgoing.length > cap,
              incoming: incoming.truncated,
              candidates: others.length > MAX_CANDIDATES,
            },
          };
        }).pipe(Effect.mapError(toFailure)),

      files: ({ prefix, language, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, FILES_DEFAULT_LIMIT, FILES_MAX_LIMIT);
          const all = yield* store.listFiles({ language });
          const matching = prefix === undefined ? all : all.filter((file) => file.path.startsWith(prefix));
          return {
            files: matching
              .slice(0, cap)
              .map((file) => ({ path: file.path, language: file.language, size: file.size })),
            total: matching.length,
            truncated: matching.length > cap,
          };
        }).pipe(Effect.mapError(toFailure)),

      design: ({ prompt, budget, threshold }) =>
        designCache.pipe(
          Effect.flatMap((cache) =>
            Design.answer(store, cache, {
              prompt,
              budget: budget === undefined ? undefined : clamp(budget, DESIGN_DEFAULT_BUDGET, DESIGN_MAX_BUDGET),
              threshold: threshold === undefined ? undefined : Math.min(1, Math.max(0, threshold)),
            }),
          ),
          Effect.mapError(toFailure),
        ),

      stats: () =>
        summary.pipe(
          Effect.map(({ files, quads, derived }) => ({
            backend: store.backend,
            dir: store.dir,
            files,
            quads,
            derived,
          })),
          Effect.mapError(toFailure),
        ),
    });
  });

//
// Server.
//

const PREFIXES_NOTE =
  'Prefixes, declared automatically when a query omits them: deus: = https://dxos.org/vocab/deus# (classes and ' +
  'predicates), file: = https://dxos.org/deus/file/ (files; a symbol is <file IRI>#<name>), pkg: = ' +
  'https://dxos.org/deus/package/ (packages by package.json name), module: = https://dxos.org/deus/module/ ' +
  '(modules as imported, e.g. module:effect/Layer#effect), graph:, rdf:, rdfs:, xsd:. Every file is its own named ' +
  'graph and the default graph is their union, so patterns need no GRAPH clause.';

export const INSTRUCTIONS =
  'Read-only access to a code index: the files, packages, symbols and relations of one repository as an RDF ' +
  'graph (the DEUS ontology, design/ONTOLOGY.md). Start with `vocabulary` to learn the classes and predicates, ' +
  '`describe` to explore a file, package, symbol, operation key, ECHO typename or plugin id by name, and ' +
  '`query`/`ask` for SPARQL (cancelled after 30 s by default; prefer bound subjects and LIMITs over unbounded ' +
  'property paths). ' +
  PREFIXES_NOTE;

export type RunOptions = {
  /** The store directory to open. */
  readonly dir: string;
  readonly backend?: Store.Backend;
  readonly version: string;
};

/** Opens the store read-only for the enclosing scope; a store another process holds fails with that process named. */
export const open = (dir: string, backend?: Store.Backend) =>
  Layer.build(Store.layer(dir, backend, { readOnly: true })).pipe(
    Effect.catchTag('code-index/StoreError', (error) => Lock.explain(dir, error)),
    Effect.map((context) => Context.get(context, Store.Store)),
  );

/** Opens the store, before the transport starts so a failure is reported, then serves until stdin closes. */
export const run = ({ dir, backend, version }: RunOptions) =>
  Effect.gen(function* () {
    const store = yield* open(dir, backend);
    yield* Effect.logInfo(`code-index mcp: serving ${dir} (${store.backend} backend) over stdio`);
    return yield* Layer.launch(
      McpServer.toolkit(CodeIndexToolkit).pipe(
        Layer.provide(CodeIndexToolkit.toLayer(handlers(store))),
        Layer.provide(
          McpServer.layerStdio({
            name: 'code-index',
            version,
            instructions: INSTRUCTIONS,
            // A request without a version before `initialize` falls back to the first adapter.
            protocols: [McpProtocol.v2025_06_18, McpProtocol.v2025_03_26, McpProtocol.v2025_11_25],
          }),
        ),
      ),
    );
  });
