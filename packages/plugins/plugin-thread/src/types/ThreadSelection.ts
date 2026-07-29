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

/** Graph node id for a thread, namespaced so it cannot collide with the root message's own node. */
export const getThreadNodeId = (channel: Channel.Channel, threadId: string): string =>
  `${Obj.getURI(channel)}/thread/${threadId}`;
