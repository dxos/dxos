//
// Copyright 2026 DXOS.org
//

import type { RatingModel, RatingOverrides } from '../model/rating.ts';

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

export type Report = { answer?: string; picks: Pick[]; gaps?: string; next?: string };

export type SessionStatus = 'starting' | 'running' | 'idle' | 'reported' | 'stopped' | 'failed';

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
