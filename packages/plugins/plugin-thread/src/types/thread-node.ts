//
// Copyright 2026 DXOS.org
//

/**
 * How a thread is addressed in the app graph: the way a mailbox filter is, with the *channel* as the
 * subject — the object the node and its surface carry — and the thread id as metadata scoping it.
 * Threads have no object of their own (the id is the root message's), and making a `(channel,
 * threadId)` pair the subject instead would leave every node carrying a synthetic value no other
 * consumer of the graph can read.
 */

/** Node property naming the thread a channel node is scoped to. */
export const THREAD_ID_PROPERTY = 'threadId';

/** The thread a node's (or a surface's) properties scope it to, if any. */
export const getThreadId = (properties?: Record<string, any>): string | undefined => {
  const threadId = properties?.[THREAD_ID_PROPERTY];
  return typeof threadId === 'string' ? threadId : undefined;
};

/**
 * Graph node id for a thread, prefixed so it cannot collide with the root message's own node. A
 * single path segment (no `/`): the graph builder rejects separators in node ids and qualifies this
 * with the channel's path itself, which is what makes it unique across channels.
 */
export const getThreadNodeId = (threadId: string): string => `thread-${threadId}`;
