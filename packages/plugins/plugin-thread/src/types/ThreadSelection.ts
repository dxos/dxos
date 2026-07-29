//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

/**
 * A thread addressed as `(channel, threadId)`. Threads have no object of their own — the id is the
 * root message's — so navtree nodes and surfaces carry this pair instead. Deliberately not a bare
 * `Message`: `plugin-inbox` already claims the article surface for every non-draft message.
 */
export type ThreadSelection = {
  channel: Channel.Channel;
  /** Root message id, which is also the `threadId` its replies carry. */
  threadId: string;
};

export const isThreadSelection = (value: unknown): value is ThreadSelection =>
  typeof value === 'object' &&
  value !== null &&
  'threadId' in value &&
  typeof (value as ThreadSelection).threadId === 'string' &&
  Obj.instanceOf(Channel.Channel, (value as ThreadSelection).channel);

/**
 * Graph node id for a thread, prefixed so it cannot collide with the root message's own node. A
 * single path segment (no `/`): the graph builder rejects separators in node ids and qualifies this
 * with the channel's path itself, which is what makes it unique across channels.
 */
export const getThreadNodeId = (threadId: string): string => `thread-${threadId}`;
