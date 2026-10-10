//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as LanguageModel from 'effect/ai/LanguageModel';
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

import * as Declarations from '../Declarations.ts';
import * as Cache from '../design/Cache.ts';
import * as Design from '../design/Design.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Summary from '../Summary.ts';
import * as Models from '../workspace/Models.ts';
import * as Lock from './Lock.ts';
import * as Sparql from './Sparql.ts';
import * as Terms from './Terms.ts';

/**
 * `code-index mcp`: a read-only MCP server over stdio, so an MCP client can query the index the
 * way the workspace agent does. It opens an existing store and never indexes or writes.
 */

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

export const QUERY_DEFAULT_LIMIT = 200;
export const QUERY_MAX_LIMIT = 2_000;
export const QUERY_DEFAULT_TIMEOUT_MS = 30_000;
export const QUERY_MAX_TIMEOUT_MS = 120_000;
export const DESCRIBE_DEFAULT_LIMIT = 50;
export const DESCRIBE_MAX_LIMIT = 500;
export const FILES_DEFAULT_LIMIT = 500;
export const FILES_MAX_LIMIT = 5_000;
export const USAGES_DEFAULT_LIMIT = 500;
export const USAGES_MAX_LIMIT = 5_000;
/** Reference rows read for one symbol; past this the totals come from a COUNT and the roles are partial. */
const USAGES_MAX_ROWS = 50_000;
export const DESIGN_DEFAULT_BUDGET = 30;
export const DESIGN_MAX_BUDGET = 200;

/** Candidates listed when a name matches several resources, rather than describing one at random. */
export const MAX_CANDIDATES = 20;

/** Matches fetched to rank before the candidate cap; past this the total is reported as a lower bound. */
const MAX_MATCHES = 500;

const clamp = (value: number | undefined, fallback: number, max: number): number =>
  Math.min(Math.max(1, Math.floor(value ?? fallback)), max);

/** Only names SPARQL accepts as a prefixed name's local part are compacted, so output pastes back into a query. */
const LOCAL_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export const compact = (iri: string): string => {
  for (const [prefix, base] of Object.entries(Sparql.NAMESPACES)) {
    if (iri.startsWith(base) && LOCAL_NAME.test(iri.slice(base.length))) {
      return `${prefix}:${iri.slice(base.length)}`;
    }
  }
  return iri;
};

/** A full IRI, `<…>` or a `prefix:` name over {@link Sparql.NAMESPACES}; anything else is a name to resolve. */
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
    const base = Sparql.NAMESPACES[trimmed.slice(0, colon)];
    if (base !== undefined) {
      return `${base}${trimmed.slice(colon + 1)}`;
    }
  }
  return undefined;
};

/** A SPARQL string literal; JSON's escapes are a subset of SPARQL's. */
const literal = (value: string): string => JSON.stringify(value);

const INVALID_IRI = /[<>"{}|^`\\\s]/;

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
      'deus:Operation ; deus:operationKey ?key ; ^deus:declares/deus:inPackage pkg:@dxos/plugin-markdown }. ' +
      "Operation X's key, and where its definition is: SELECT ?key ?path ?line WHERE { ?op a deus:Operation ; " +
      'deus:name "Create" ; deus:operationKey ?key ; ^deus:declares/deus:path ?path . ?c deus:enclosedBy ?op ; a ' +
      'deus:CallSite ; deus:line ?line FILTER NOT EXISTS { ?c deus:argOf ?outer } }. The surfaces plugin X ' +
      'registers: SELECT ?id ?path ?line WHERE { ?plugin a deus:Plugin ; deus:pluginId "org.dxos.plugin.markdown" . ' +
      '?surface deus:providedBy ?plugin ; deus:line ?line ; deus:enclosedBy/^deus:declares/deus:path ?path ' +
      'OPTIONAL { ?surface deus:surfaceId ?id } }',
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

const UsageRole = Schema.Literals(['impl', 'test', 'story']);

const RoleCounts = Schema.Struct({ impl: Schema.Number, test: Schema.Number, story: Schema.Number });

const UsageFile = Schema.Struct({
  path: Schema.String,
  role: UsageRole,
  symbols: Schema.Array(Schema.String).annotate({ description: 'The symbols of the file that use it.' }),
  via: Schema.Literals(['direct', 'barrel']).annotate({
    description: 'direct when a symbol names the declaration itself; barrel when only through a re-export.',
  }),
});

export const Usages = readOnly(
  Tool.make('usages', {
    description:
      'Finds every symbol that uses a declaration, through `export *` barrels, named re-exports, namespaces ' +
      '(`Order.natural` via `export * as Order`) and bare specifiers, grouped by package. Each file has a role — ' +
      'test (a *.test.* / *.spec.* file), story (*.stories.*) or impl — and `via`. `reexportedBy` lists the ' +
      'barrels and alias files it passes through; `total` counts symbols, files, packages and roles before the ' +
      '`limit` on files (default 500, max 5000). `symbol` takes the forms `describe` does; an alias or a barrel ' +
      'reference is followed to its declaration, and several declarations come back as `candidates`. Example: ' +
      '{ "symbol": "proxyFetchLegacy", "includeTests": false }',
    parameters: Schema.Struct({
      symbol: Schema.String.annotate({ description: DESCRIBE_FORMS }),
      kind: Schema.optional(
        Schema.Literals(['api', 'impl', 'all']).annotate({
          description: 'api: uses in signatures (deus:apiDependsOn); impl: in bodies; all (default): both.',
        }),
      ),
      includeTests: Schema.optional(
        Schema.Boolean.annotate({ description: 'Whether test files count (default true); stories always do.' }),
      ),
      limit: count(`Maximum files to list (default ${USAGES_DEFAULT_LIMIT}, max ${USAGES_MAX_LIMIT}).`),
    }),
    success: Schema.Struct({
      declaration: Schema.optional(Schema.String),
      resolvedBy: Schema.optional(Schema.String),
      candidates: Schema.Array(Candidate),
      packages: Schema.Array(
        Schema.Struct({
          package: Schema.String.annotate({ description: 'The package name, or "" for a file in none.' }),
          counts: RoleCounts,
          files: Schema.Array(UsageFile),
        }),
      ),
      reexportedBy: Schema.Array(Schema.String).annotate({
        description: 'Paths of the barrels and alias files a use reaches the declaration through.',
      }),
      total: Schema.Struct({
        symbols: Schema.Number,
        files: Schema.Number,
        packages: Schema.Number,
        impl: Schema.Number,
        test: Schema.Number,
        story: Schema.Number,
      }),
      truncated: Schema.Boolean,
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
      'graph per rules file under graph:derived/ and per JS pass under graph:pass/). Example follow-up — what one rules file concludes: SELECT ?p (COUNT(*) AS ?n) WHERE { ' +
      'GRAPH <https://dxos.org/deus/graph/derived/30-compute> { ?s ?p ?o } } GROUP BY ?p',
    parameters: Tool.EmptyParams,
    success: Schema.Struct({
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
      'Answers a design question with the files that matter and how they connect. With an Anthropic key the ' +
      'server has a small model run SPARQL queries for the prompt and selects from their union (tests, stories, ' +
      'generated and file-local code hidden unless asked for; System One relevance boosted by connectivity; kept ' +
      'connected); without one it walks from text-matched seeds and scores by System One blended with a ' +
      'text/degree baseline (the baseline alone without TYPESAFE_API_KEY). It prunes to `budget` files (default 30) and ' +
      "returns them best first with their edges, plus a compact draft of at most 14 boxes in plugin-illustrator's " +
      'semantic diagram DSL, each box\'s `ref` its file. Takes a few seconds. Example: { "prompt": "how does the agent runtime ' +
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
      diagram: Schema.String,
    }),
    failure: ToolFailure,
  }),
);

export const CodeIndexToolkit = Toolkit.make(Query, Ask, Vocabulary, Describe, Usages, Files, Stats, DesignTool);

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
// Usages.
//

type Role = Declarations.Role;

/** The repository-relative path of a `file:` IRI's file, which `Ontology.fileIri` escaped. */
const pathOfFileIri = (iri: string): string | undefined => {
  const hash = iri.indexOf('#');
  return iri.startsWith(Ontology.FILE_BASE)
    ? decodeURIComponent(iri.slice(Ontology.FILE_BASE.length, hash < 0 ? undefined : hash))
    : undefined;
};

const USAGE_PREDICATES = {
  api: [Ontology.apiDependsOn.value],
  impl: [Ontology.implDependsOn.value],
  all: [Ontology.implDependsOn.value, Ontology.apiDependsOn.value],
} as const;

/**
 * Each use of `declaration`, directly or through a reference, joined with `tail` inside every branch:
 * the native evaluator joins a UNION with what follows it by scanning, so the tail must not trail it.
 */
const usagePattern = (declaration: string, predicates: readonly string[], tail: string): string =>
  predicates
    .flatMap((predicate) => [
      `{ ?user <${predicate}> <${declaration}> . BIND(<${declaration}> AS ?ref) ${tail} }`,
      `{ ?ref deus:resolvesTo <${declaration}> . ?user <${predicate}> ?ref . ${tail} }`,
    ])
    .join(' UNION ');

const usageQuery = (declaration: string, predicates: readonly string[], limit: number): string => `${DEUS}
  SELECT DISTINCT ?user ?name ?kind ?ref ?path ?pkg ?test WHERE {
    ${usagePattern(
      declaration,
      predicates,
      `?file deus:declares ?user ; deus:path ?path .
      OPTIONAL { ?user deus:name ?name }
      OPTIONAL { ?user deus:kind ?kind }
      OPTIONAL { ?file deus:inPackage ?package . ?package deus:name ?pkg }
      OPTIONAL { ?file deus:testFile ?test }`,
    )}
  } LIMIT ${limit}`;

const usageCountQuery = (declaration: string, predicates: readonly string[]): string => `${DEUS}
  SELECT (COUNT(DISTINCT ?user) AS ?symbols) (COUNT(DISTINCT ?file) AS ?files) WHERE {
    ${usagePattern(declaration, predicates, '?file deus:declares ?user .')}
  }`;

type UsageFileEntry = { path: string; role: Role; symbols: Set<string>; direct: boolean; package: string };

/**
 * Groups reference rows by package and file. A re-export is a passage, not a use, so it lands in
 * `reexportedBy`; a symbol depending on both twins of one import (`module:` and `file:`) counts once.
 */
const groupUsages = (
  declaration: string,
  rows: readonly Store.Binding[],
  options: { readonly includeTests: boolean; readonly limit: number },
) => {
  const declarationFile = pathOfFileIri(declaration);
  const reexportedBy = new Set<string>();
  const files = new Map<string, UsageFileEntry>();
  const users = new Set<string>();
  for (const row of rows) {
    const barrel = row.ref === declaration ? undefined : pathOfFileIri(row.ref);
    if (barrel !== undefined && barrel !== declarationFile) {
      reexportedBy.add(barrel);
    }
    if (row.kind === 'reexport') {
      reexportedBy.add(row.path);
      continue;
    }
    // A recursive declaration names itself; that is not a use.
    if (row.user === declaration) {
      continue;
    }
    const role = Declarations.roleOf(row.path, row.test === 'true');
    if (role === 'test' && !options.includeTests) {
      continue;
    }
    users.add(row.user);
    const entry = files.get(row.path) ?? {
      path: row.path,
      role,
      symbols: new Set<string>(),
      direct: false,
      package: row.pkg ?? '',
    };
    entry.symbols.add(row.name ?? row.user);
    entry.direct ||= row.ref === declaration;
    files.set(row.path, entry);
  }

  const sorted = [...files.values()].sort(
    (left, right) => left.package.localeCompare(right.package) || left.path.localeCompare(right.path),
  );
  const total = { impl: 0, test: 0, story: 0 };
  const packages = new Map<
    string,
    {
      package: string;
      counts: Record<Role, number>;
      files: { path: string; role: Role; symbols: string[]; via: 'direct' | 'barrel' }[];
    }
  >();
  sorted.forEach((entry, index) => {
    total[entry.role]++;
    const group = packages.get(entry.package) ?? {
      package: entry.package,
      counts: { impl: 0, test: 0, story: 0 },
      files: [],
    };
    group.counts[entry.role]++;
    if (index < options.limit) {
      group.files.push({
        path: entry.path,
        role: entry.role,
        symbols: [...entry.symbols].sort(),
        via: entry.direct ? 'direct' : 'barrel',
      });
    }
    packages.set(entry.package, group);
  });
  return {
    // Past the cap a package keeps only its place in `total`, so the answer stays bounded.
    packages: [...packages.values()].filter((group) => group.files.length > 0),
    reexportedBy: [...reexportedBy].sort(),
    total: { symbols: users.size, files: sorted.length, packages: packages.size, ...total },
    truncated: sorted.length > options.limit,
  };
};

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
     * Bounds a store call by the caller's timeout. Interruption reaches the evaluator, which stops at
     * its next quad read.
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
      const prepared = Sparql.withPrefixes(sparql);
      const warnings = Sparql.unknownTermWarnings(sparql, known);
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
          const rows = yield* bounded(store.select(Sparql.boundQuery(prepared.sparql, cap + 1)), timeoutMs);
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
            return { prefixes: { ...Sparql.NAMESPACES }, terms };
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

      usages: ({ symbol, kind, includeTests, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, USAGES_DEFAULT_LIMIT, USAGES_MAX_LIMIT);
          const none = {
            candidates: [],
            packages: [],
            reexportedBy: [],
            total: { symbols: 0, files: 0, packages: 0, impl: 0, test: 0, story: 0 },
            truncated: false,
          };
          const matches = yield* resolve(symbol);
          if (matches.length === 0) {
            return { ...none, hint: `Nothing matched ${JSON.stringify(symbol)}. ${DESCRIBE_FORMS}` };
          }
          // The best tier, each followed to its declaration. A symbol outranks a type property of the same
          // name, and an exported one a file-local one (a test's `const proxyFetchLegacy = vi.fn()`).
          const tier = matches.filter((match) => match.tier === matches[0].tier);
          const preferred = (candidates: readonly Match[], keep: (match: Match) => boolean) =>
            candidates.some(keep) ? candidates.filter(keep) : candidates;
          const valid = preferred(
            preferred(tier, (match) => match.primary),
            (match) => match.exported || match.packagePublic,
          ).filter((match) => !INVALID_IRI.test(match.iri));
          const declared = yield* Effect.forEach(valid, (match) =>
            Effect.map(
              store.select(`${DEUS} SELECT ?declaration WHERE { <${match.iri}> deus:resolvesTo ?declaration }`),
              (rows) => ({ ...match, iri: rows[0]?.declaration ?? match.iri }),
            ),
          );
          const declarations = best(declared);
          const [chosen, ...others] = declarations;
          if (chosen === undefined) {
            return { ...none, hint: `Not a valid IRI: ${matches[0].iri}` };
          }
          if (others.length > 0) {
            return { ...none, candidates: yield* candidatesOf(declarations) };
          }
          const predicates = USAGE_PREDICATES[kind ?? 'all'];
          const rows = yield* store.select(usageQuery(chosen.iri, predicates, USAGES_MAX_ROWS + 1));
          const grouped = groupUsages(chosen.iri, rows.slice(0, USAGES_MAX_ROWS), {
            includeTests: includeTests ?? true,
            limit: cap,
          });
          if (rows.length <= USAGES_MAX_ROWS) {
            return { declaration: chosen.iri, resolvedBy: chosen.matchedBy, candidates: [], ...grouped };
          }
          // Too many rows to group: the symbol and file totals are counted, and the rest describe the rows read.
          const [counted] = yield* store.select(usageCountQuery(chosen.iri, predicates));
          return {
            declaration: chosen.iri,
            resolvedBy: chosen.matchedBy,
            candidates: [],
            ...grouped,
            total: {
              ...grouped.total,
              symbols: Number(counted?.symbols ?? grouped.total.symbols),
              files: Number(counted?.files ?? grouped.total.files),
            },
            truncated: true,
            hint: `Over ${USAGES_MAX_ROWS} references: roles and packages cover the first ${USAGES_MAX_ROWS}, and the symbol and file totals include re-exports and tests.`,
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
        Effect.all([designCache, Effect.serviceOption(LanguageModel.LanguageModel)]).pipe(
          Effect.flatMap(([cache, explorer]) =>
            Design.answer(
              store,
              cache,
              {
                prompt,
                budget: budget === undefined ? undefined : clamp(budget, DESIGN_DEFAULT_BUDGET, DESIGN_MAX_BUDGET),
                threshold: threshold === undefined ? undefined : Math.min(1, Math.max(0, threshold)),
              },
              explorer,
            ),
          ),
          // The server has no chat model; an Anthropic key buys the query explorer, else the walk runs.
          (effect) =>
            Models.hasAnthropicKey()
              ? Effect.provide(effect, Models.layer({ provider: 'anthropic', model: Models.DEFAULT_EXPLORER_MODEL }))
              : effect,
          Effect.mapError(toFailure),
        ),

      stats: () =>
        summary.pipe(
          Effect.map(({ files, quads, derived }) => ({
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
  '`describe` to explore a file, package, symbol, operation key, ECHO typename or plugin id by name, ' +
  '`usages` for who uses a declaration (through barrels, re-exports and namespaces, grouped by package), and ' +
  '`query`/`ask` for SPARQL (cancelled after 30 s by default; prefer bound subjects and LIMITs over unbounded ' +
  'property paths). A dependency edge names a declaration as its file imported it; `deus:resolvesTo` gives the ' +
  'declaration, so the users of D are ?user deus:implDependsOn|deus:apiDependsOn ?r . ?r deus:resolvesTo? D. ' +
  PREFIXES_NOTE;

export type RunOptions = {
  /** The store directory to open. */
  readonly dir: string;
  readonly version: string;
};

/** Opens the store read-only for the enclosing scope; a store another process holds fails with that process named. */
export const open = (dir: string) =>
  Layer.build(Store.layer(dir, { readOnly: true })).pipe(
    Effect.catchTag('code-index/StoreError', (error) => Lock.explain(dir, error)),
    Effect.map((context) => Context.get(context, Store.Store)),
  );

/** Opens the store, before the transport starts so a failure is reported, then serves until stdin closes. */
export const run = ({ dir, version }: RunOptions) =>
  Effect.gen(function* () {
    const store = yield* open(dir);
    yield* Effect.logInfo(`code-index mcp: serving ${dir} over stdio`);
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
