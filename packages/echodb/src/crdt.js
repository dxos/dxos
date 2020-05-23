//
// Copyright 2020 DxOS
//

import { sortByProperty } from './util';

// TODO(burdon): Move engineering docs here.
// TODO(burdon): Dependency Graph: https://www.npmjs.com/package/dependency-graph

/**
 * Merge the given feeds, respecting the order when messages include the ID of a previous message.
 * @param {[{ id, messages }]} feeds
 * @return {[{Message}]}
 */
export function mergeFeeds (feeds) {
  // Ordered list of merged messages.
  // TODO(burdon): Convert to stream.
  const merged = [];

  // Set of already merged objects (used to unlock pending messages).
  const messages = new Set();

  // Initial feed cursors (sorted to ensure deterministic processing of messages.
  const feedCursors = feeds
    .map(() => ({ position: 0, pending: null }))
    .sort(sortByProperty('id'));

  // Gets the index of the next available feed to process.
  const nextIndex = (current) => {
    let count = feedCursors.length;

    let next = -1;
    while (count > 0 && next === -1) {
      if (++current === feedCursors.length) {
        current = 0;
      }

      // Skip if exhausted or pending.
      // TODO(burdon): Currently each feed blocks until the depending mutation is resolved, but we could
      // restrict the dependencies to individual objects and create multiple concurrent DAGs.
      if (feedCursors[current].position === feeds[current].messages.length || feedCursors[current].pending) {
        count--;
        continue;
      }

      next = current;
    }

    return next;
  };

  // Breadth-first merge.
  let current = -1;
  while ((current = nextIndex(current)) !== -1) {
    const index = feedCursors[current];

    // Continue if pending.
    const message = feeds[current].messages[index.position];
    if (message.depends && !messages.has(message.depends)) {
      index.pending = message.depends;
      continue;
    }

    // Unlock pending messages.
    // TODO(burdon): Should be hierarchical.
    feedCursors.forEach((index) => {
      if (index.pending === message.id) {
        index.pending = null;
      }
    });

    // Append the message and increment the cursor.
    messages.add(message.id);
    merged.push(message);
    index.position++;
  }

  return merged;
}
