//
// Copyright 2026 DXOS.org
//
// The globals available to code run by the `exec` tool. Handed to the model verbatim as the tool's
// documentation (see `Docs.ts`), so every change here is a change to what the agent is told.
//

/** One SPARQL SELECT row: variable name to its term's lexical value. */
declare type Row = Record<string, string>;

declare type Kind = 'markdown' | 'mermaid' | 'table' | 'json' | 'text';

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
  /** Names and one-line descriptions of the ontology's classes and predicates. */
  vocabulary(): Promise<{ term: string; kind: 'class' | 'property'; comment?: string }[]>;
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
  /** Empties the canvas. */
  clear(): Promise<void>;
};

/**
 * Writes to the transcript the model reads back — the return channel for intermediate findings.
 * `console.log` is captured the same way. Neither reaches the user's screen.
 */
declare const print: (...values: unknown[]) => void;
