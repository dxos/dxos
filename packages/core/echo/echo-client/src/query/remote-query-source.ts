//
// Copyright 2026 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';

import { type SourceEntry } from './query-context.ts';

export type RemoteRunOptions = {
  /** Receives the time (ms) the remote spent evaluating the answer, when it reports one. */
  onExecutionTime?: (executionTime: number) => void;
};

/**
 * An out-of-process answerer of queries: the host index, or EDGE through the same `QueryService`. Its
 * entries are evidence the {@link LocalQueryEngine} revalidates against the working set before presenting
 * them; one instance serves one engine. See `docs/SYNC_QUERIES.md` §3.2.
 */
export interface RemoteQuerySource {
  readonly changed: Event<void>;

  /** Where the entries come from; never an in-process kind. */
  readonly kind: Exclude<QueryResult.Source, 'local' | 'registry'>;

  /** Whether this source serves the current query at all. */
  isServing(): boolean;

  /** Answers integrated for the current query, re-runs that left it unchanged included. */
  answers(): number;

  /** Whether the current query's stream failed. */
  isFailed(): boolean;

  /** Whether the latest answer left out paths or manifests over its budget, so some entries cannot be revalidated. */
  isTruncated(): boolean;

  /** Whether this source serves the current query and has yet to answer it. */
  isPending(): boolean;

  /** Time (ms) the remote spent evaluating the latest integrated answer; undefined until it reports one. */
  executionTime?(): number | undefined;

  open(): void;

  close(): void;

  /** The entries of the latest integrated answer. */
  getResults(): SourceEntry[];

  /** One-shot query. */
  run(ctx: Context, query: QueryAST.Query, opts?: RemoteRunOptions): Promise<SourceEntry[]>;

  /** Sets the query and starts its reactive stream once the source is open. */
  update(query: QueryAST.Query): void;
}
