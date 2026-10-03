//
// Copyright 2026 DXOS.org
//
// The globals available to code run by the `exec` tool. Handed to the model verbatim as the tool's
// documentation (see `Docs.ts`), so every change here is a change to what the agent is told.
//

/** One SPARQL SELECT row: variable name to its term's lexical value. */
declare type Row = Record<string, string>;

declare type Kind = 'markdown' | 'mermaid' | 'table' | 'json' | 'text' | 'graph';

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
  /** Markdown. Fenced ```mermaid blocks inside it render as diagrams. */
  markdown(content: string, title?: string): Promise<void>;
  /** A Mermaid diagram source (`graph TD`, `sequenceDiagram`, `classDiagram`, …). */
  mermaid(source: string, title?: string): Promise<void>;
  /** An array of uniform objects, rendered as a table. */
  table(rows: readonly Record<string, unknown>[], title?: string): Promise<void>;
  /** Any value, rendered as pretty JSON. */
  json(value: unknown, title?: string): Promise<void>;
  /** Preformatted text. */
  text(content: string, title?: string): Promise<void>;
  /**
   * An interactive force-directed graph: for exploring a structure too big for one diagram. Prefer
   * `mermaid` for a final answer of a dozen boxes.
   */
  graph(graph: GraphData, title?: string): Promise<void>;
  /** Empties the canvas. */
  clear(): Promise<void>;
};

/**
 * Design questions ("how does X wire its services?"). `subgraph` explores the index from the prompt,
 * scores every candidate file's relevance (System One when the host has a key, else a text and degree
 * baseline) and returns the scored graph — ready for `display.graph`, with the relevant nodes `kept`.
 * Takes seconds to a minute; call it once per question.
 */
declare const design: {
  subgraph(
    prompt: string,
    options?: { budget?: number; threshold?: number },
  ): Promise<GraphData & { grouping: string; scorer: string }>;
};

/**
 * Writes to the transcript the model reads back — the return channel for intermediate findings.
 * `console.log` is captured the same way. Neither reaches the user's screen.
 */
declare const print: (...values: unknown[]) => void;
