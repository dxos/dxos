//
// Copyright 2026 DXOS.org
//
// The globals available to code run by the `exec` tool. Handed to the model verbatim as the tool's
// documentation (see `Docs.ts`), so every change here is a change to what the agent is told.
//

/** One SPARQL SELECT row: variable name to its term's lexical value. */
declare type Row = Record<string, string>;

declare type Kind = 'markdown' | 'diagram' | 'table' | 'json' | 'text' | 'graph';

/** One node of a `display.graph` presentation. */
declare type GraphNode = {
  id: string;
  label: string;
  /** Nodes sharing a group cluster together and collapse into one on click. */
  group?: string;
  /** Relevance in [0, 1]: drives size and opacity (default 1). */
  score?: number;
  /** `false` hides the node until the user asks for everything (default true). */
  kept?: boolean;
  /** Shown when the user clicks the node — e.g. path, kind, doc, snippet. */
  card?: Record<string, unknown>;
};

declare type GraphEdge = { from: string; to: string; kind?: string };

/** One box of a `display.diagram`. */
declare type DiagramNode = {
  /** Any string — a package name, a path; edges and `group` refer to boxes by it. */
  id: string;
  /** What the box says (default: the id). At most ~17 characters reads on one line. */
  label?: string;
  /** The id of the group the box sits in. */
  group?: string;
  /** The repository-relative path the box depicts; the user sees it when they click the box. */
  ref?: string;
};

/**
 * `from` depends on, calls or owns `to`. `kind` changes the arrow: `creates` is dashed, `inheritance`
 * and `implements` point from the subtype at its base (hollow triangle), and `hasMany` and `contains`
 * point from the owner. An edge naming an undeclared id declares that box.
 */
declare type DiagramEdge = {
  from: string;
  to: string;
  /** Label only the edges that say something; unlabelled edges route more cleanly. */
  label?: string;
  kind?: 'reference' | 'creates' | 'inheritance' | 'implements' | 'hasMany' | 'contains';
};

/** A framed, tinted cluster of boxes. Groups do not nest. */
declare type DiagramGroup = { id: string; label?: string };

/** A diagram as data: the illustrator lays it out (ELK, routed connectors) and draws exactly this. */
declare type DiagramSpec = {
  /** Flow direction (default `TB`). */
  direction?: 'TB' | 'LR';
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  groups?: DiagramGroup[];
};

declare type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * The code index: this repository's files, packages, symbols and the relations between them, as an
 * RDF graph. Every file lives in its own named graph and the default graph is their union, so a
 * pattern without a `GRAPH` clause matches everything.
 */
declare const rdf: {
  /** Runs a SPARQL SELECT. Prefer `LIMIT` — the graph has millions of quads. */
  query(sparql: string): Promise<Row[]>;
  /** Runs a SPARQL ASK. */
  ask(sparql: string): Promise<boolean>;
  /** The prefix map the index writes, e.g. `deus:` → `https://dxos.org/vocab/deus#`. */
  prefixes(): Promise<Record<string, string>>;
  /**
   * Every class and predicate present in the graph, with how many quads use it — the derived ones
   * (`EffectLayer`, `providesService`, …) included. Read this before guessing a predicate name.
   */
  vocabulary(): Promise<{ term: string; kind: 'class' | 'property'; count: number }[]>;
};

/** Persistent, per-project key/value memory. Values are JSON-encoded; survives restarts. */
declare const storage: {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  keys(): Promise<string[]>;
};

/**
 * The only channel to the user's screen. Anything not published here is invisible to them — a
 * result described in prose but never displayed has not been shown. Each call appends a panel to
 * the canvas, which opens as a split screen beside the chat.
 */
declare const display: {
  /** Markdown (GFM), rendered without raw HTML; a diagram goes in its own `diagram` call. */
  markdown(content: string, title?: string): Promise<void>;
  /**
   * A boxes-and-arrows diagram, laid out and drawn by the illustrator. Build the spec from query rows —
   * ids can be any string, so no escaping. Keep it to ≲ 14 boxes and ≤ 3 groups; past that, split it.
   * A Mermaid flowchart string (`flowchart LR`, `Id[Label]`, flat `subgraph`, `-->`, `-->|label|`) is
   * accepted too and reduced to the same spec. Rejects (the call throws) anything with no boxes.
   */
  diagram(diagram: DiagramSpec | string, title?: string): Promise<void>;
  /** An array of uniform objects, rendered as a table. */
  table(rows: readonly Record<string, unknown>[], title?: string): Promise<void>;
  /** Any value, rendered as pretty JSON. */
  json(value: unknown, title?: string): Promise<void>;
  /** Preformatted text. */
  text(content: string, title?: string): Promise<void>;
  /**
   * An interactive force-directed graph: for exploring a structure too big for one diagram. Prefer
   * `diagram` for a final answer of a dozen boxes.
   */
  graph(graph: GraphData, title?: string): Promise<void>;
  /** Empties the canvas. */
  clear(): Promise<void>;
};

/**
 * Design questions ("how does X wire its services?"). `subgraph` has a small model query the index for
 * the prompt, selects from what the queries found (tests and internals hidden unless the prompt asks,
 * relevance by System One when the host has a key, boosted by connectivity, kept connected) and returns
 * the scored graph — ready for `display.graph`, with the relevant nodes `kept`.
 * Takes seconds to a minute; call it once per question.
 */
declare const design: {
  subgraph(
    prompt: string,
    options?: { budget?: number; threshold?: number },
  ): Promise<GraphData & { grouping: string; scorer: string }>;
};

/** One declaration of a name, as `symbols.declarations` returns it. */
declare type Declaration = {
  iri: string;
  name: string;
  kind?: string;
  /** Repository-relative path of the declaring file. */
  path: string;
  /** The declaring file's package, e.g. `@dxos/edge-client`. */
  package?: string;
  exported: boolean;
  /** Reachable from the package's public entry points. */
  packagePublic: boolean;
  /** `test` for a *.test.* / *.spec.* file, `story` for *.stories.*. */
  role: 'impl' | 'test' | 'story';
};

/**
 * Symbol lookups that rank the way a person would. Use these rather than hand-written SPARQL to find
 * where something is defined or who uses it: a bare name often has several declarations — the real
 * one plus test doubles and story locals — and an unordered query returns whichever comes first.
 */
declare const symbols: {
  /**
   * Every declaration of `name` (a bare name, or a canonical one like `Order.natural`), best first:
   * package-public, then exported, then impl over story over test. `[0]` is the definition.
   */
  declarations(name: string): Promise<Declaration[]>;
  /**
   * Who uses a declaration, through barrels, re-exports and namespaces, grouped by package — the MCP
   * `usages` tool. `symbol` is a name, an IRI or `<path>#<name>`; a name with several equally good
   * declarations returns them as `candidates` and no `declaration`.
   */
  usages(
    symbol: string,
    options?: { kind?: 'api' | 'impl' | 'all'; includeTests?: boolean; limit?: number },
  ): Promise<{
    declaration?: string;
    candidates: { iri: string; types: string[]; matchedBy: string }[];
    packages: {
      package: string;
      counts: { impl: number; test: number; story: number };
      files: { path: string; role: 'impl' | 'test' | 'story'; symbols: string[]; via: 'direct' | 'barrel' }[];
    }[];
    reexportedBy: string[];
    total: { symbols: number; files: number; packages: number; impl: number; test: number; story: number };
    truncated: boolean;
    hint?: string;
  }>;
};

/**
 * Writes to the transcript the model reads back — the return channel for intermediate findings.
 * `console.log` is captured the same way. Neither reaches the user's screen.
 */
declare const print: (...values: unknown[]) => void;
