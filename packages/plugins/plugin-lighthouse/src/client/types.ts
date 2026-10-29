//
// Copyright 2026 DXOS.org
//

import type { RatingModel, RatingOverrides } from '../model/rating.ts';
import type { ResultsView } from '../model/view.ts';

/** A property value as lighthouse returns it. */
export type Value = string | number | boolean;

/** Where a set of an entity's facts came from (lighthouse-api `Provenance`). */
export type Provenance = {
  graph?: string;
  extractor: string;
  source?: string;
  snapshot?: string;
  at: string;
};

/** A subject in lighthouse's graph: its types and current property values (CURIE keys). */
export type Entity = {
  id: string;
  types: string[];
  props: Record<string, Value[]>;
  /** The trajectory seqs whose extractions wrote it; lets the thread place it under the call that found it. */
  seen?: number[];
  provenance?: Provenance[];
};

export type Budget = { minutes?: number; usd?: number; pages?: number };

export type Spend = { seconds: number; usd: number; pages: number };

export type Pick = { title: string; url?: string; subject?: string; why: string };

export type Report = { answer?: string; picks: Pick[]; gaps?: string; next?: string; subjects?: string[] };

export type SessionStatus = 'starting' | 'running' | 'idle' | 'reported' | 'stopped' | 'failed';

/** `list`: "find all X that…" (ranked results); `entity`: "everything about X" (the subjects' graph). */
export type Intent = 'list' | 'entity';

/** A search session, normalised across API versions. */
export type Session = {
  run: string;
  goal: string;
  status: SessionStatus;
  /** A turn is in flight (the agent is working). */
  busy: boolean;
  budget: Budget;
  spent: Spend;
  model?: string;
  report?: Report;
  reason?: string;
  startedAt?: string;
  intent?: Intent;
  /** An entity session's roots: the graph IRIs of its subjects. */
  subjects?: string[];
  /** Set on a deep extension's child research session: the session, subject and extension it reads for. */
  parent?: { run: string; subject?: string; extension?: string };
};

/** One trajectory event (input, decide, act, extract, load, …). */
export type TrajectoryEvent = {
  seq: number;
  t: string;
  kind: string;
  /** How long the event's work took (an act's tool call). */
  ms?: number;
  data: Record<string, unknown>;
};

export type RatingState = {
  model?: RatingModel;
  overrides?: RatingOverrides;
  /** The person's own filters and sort (results-view.json); they cut the list and never change a score. */
  view?: ResultsView;
  feedback: Record<string, 'up' | 'down'>;
};

export type Vote = 'up' | 'down' | 'clear';

/** An extended ontology: a facet of a result read on demand (a menu, rooms, move-in cost). */
export type Extension = {
  id: string;
  label: string;
  description: string;
  appliesTo: string[];
  fields: string[];
  /** A deep extension starts a child research session that finds many items. */
  research?: {
    item: string;
    items: string;
    link: string;
    /** The rdf:type of the items the child session collects (`schema:MenuItem`). */
    class?: string;
    /** Item field → the predicate it is stored under (name, price, currency, section, description …). */
    fields: Record<string, string>;
    budget: Budget;
  };
};

/** A search engine a plugin contributes. */
export type Engine = { id: string; plugin?: string; label?: string; description?: string };

export type Status = { version?: string; workspace?: string };

/** The state of one session as its stream builds it up. */
export type SessionSnapshot = {
  session?: Session;
  events: TrajectoryEvent[];
  results: Entity[];
  rating: RatingState;
  /** The last trajectory seq received; a reconnect resumes after it. */
  lastSeq?: number;
};

/** One change on a session's stream. */
export type SessionUpdate =
  | { type: 'snapshot'; snapshot: Omit<SessionSnapshot, 'lastSeq'> }
  | { type: 'events'; events: TrajectoryEvent[] }
  | { type: 'results'; results: Entity[] }
  | { type: 'rating'; rating: RatingState }
  | { type: 'session'; session: Session }
  | { type: 'connection'; connected: boolean };

/** A node of a subject's graph: identity-merged, with its types, label, a photo and its facts. */
export type GraphNode = {
  id: string;
  types: string[];
  label: string;
  props: Record<string, Value[]>;
  image?: string;
  /** Hops from the nearest root. */
  depth?: number;
  /** `role` for a role node (an employment, a membership) that links two subjects. */
  kind?: string;
};

export type GraphEdge = { from: string; to: string; predicate: string; derived?: boolean };

/** A subject's neighbourhood in the graph (lighthouse `graph <iri>…`). */
export type SubjectGraph = {
  /** The roots the walk started from. */
  roots: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Neighbours a capped node has beyond the ones shown. */
  more: Record<string, number>;
};

/** One node's facts, each with the extraction graphs that hold it. */
export type NodeFacts = {
  id: string;
  facts: Array<{ predicate: string; value: Value; ref: boolean; from: Provenance[] }>;
};

/** What ran a trace row: an LLM, a System One model (Clairic, Clef), or no model at all. */
export type ExplainCategory = 'llm' | 'system-one' | 'tool';

/** A session's trajectory as a tree: turns, calls, commands, loads and extracts, with time, cost and yield. */
export type ExplainNode = {
  id: string;
  category?: ExplainCategory;
  /** Set on a row that folds this many consecutive calls to one model. */
  group?: number;
  kind: string;
  label: string;
  detail?: string;
  t: string;
  /** Own duration: the event's ms, or for a turn the wait before it. */
  ms?: number;
  /** Wall time from this node's first event to its last child's end. */
  wallMs?: number;
  usd?: number;
  totalUsd: number;
  ok?: boolean;
  error?: string;
  model?: string;
  tokens?: { in?: number; out?: number; cached?: number };
  pages: number;
  facts: number;
  results: number;
  subjects?: number;
  predicates?: Record<string, number>;
  types?: Record<string, number>;
  seq: number;
  children: ExplainNode[];
};

/** A lighthouse plugin and what it contributes (engines, extractors, access rules, browsers, models …). */
export type Plugin = {
  id: string;
  name?: string;
  description?: string;
  core?: boolean;
  hosts: string[];
  /** Ids per kind, or a count. */
  contributes: Record<string, string[] | number>;
};

/** A predicate of the vocabulary: its meaning and the extractors that write it. */
export type Predicate = {
  iri: string;
  label?: string;
  description?: string;
  domain?: string;
  range?: string;
  synonyms: string[];
  extractors: string[];
};

export type IssueStatus = 'open' | 'in-progress' | 'fixed' | 'wontfix';

/** An issue the agent filed (a site that walled it, an extractor that mangled a field). */
export type Issue = {
  id: string;
  status: IssueStatus;
  kind: string;
  title: string;
  body: string;
  domain?: string;
  url?: string;
  severity?: string;
  by?: string;
  opened: string;
  updated: string;
  seen: number;
  notes: Array<{ t: string; by?: string; text: string; status?: IssueStatus }>;
  resolution?: string;
};

/** Bytes by area, snapshots by backend and host, the cache by namespace, store metrics; read as lighthouse writes it. */
export type StorageReport = Record<string, unknown>;
