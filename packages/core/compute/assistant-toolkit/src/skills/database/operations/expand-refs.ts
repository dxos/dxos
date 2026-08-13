//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { type URI } from '@dxos/keys';
import { deepMapValues } from '@dxos/util';

/**
 * Upper bound on `expandDepth`. Each level multiplies the payload by the object's fan-out, so one
 * level — enough to read a document with its content, or a task with its assignee — is the most a
 * tool result can absorb.
 */
export const MAX_EXPAND_DEPTH = 1;

/** Concurrency of a level's ref loads; bounded to keep one wide object off the sub-request limit. */
const LOAD_CONCURRENCY = 8;

/**
 * Replaces encoded reference envelopes (`{ "/": "echo:..." }`) in a serialized object with the
 * referenced object's own JSON, `depth` levels deep (clamped to {@link MAX_EXPAND_DEPTH}), so
 * reading a ref-bearing object does not cost a `load` round-trip per reference.
 */
export const expandRefs = Effect.fn(function* (value: unknown, depth: number) {
  let expanded = value;
  for (let level = 0; level < Math.min(depth, MAX_EXPAND_DEPTH); level++) {
    expanded = yield* expandOneLevel(expanded);
  }
  return expanded;
});

/**
 * A ref that fails to resolve is left as its envelope: a dead or unreplicated link must not fail the
 * read that happened to encounter it.
 */
const expandOneLevel = (value: unknown): Effect.Effect<unknown, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const loaded = new Map<URI.URI, unknown>();
    yield* Effect.forEach(
      collectRefUris(value),
      (uri) =>
        Database.load(db.makeRef(uri)).pipe(
          Effect.map((object) => loaded.set(uri, Entity.toJSON(object))),
          Effect.catch(() => Effect.void),
        ),
      { concurrency: LOAD_CONCURRENCY, discard: true },
    );

    return deepMapValues(value, (child, recurse) => {
      if (EncodedReference.isEncodedReference(child)) {
        return loaded.get(EncodedReference.toURI(child)) ?? child;
      }
      return recurse(child);
    });
  });

const collectRefUris = (value: unknown): URI.URI[] => {
  const uris = new Set<URI.URI>();
  deepMapValues(value, (child, recurse) => {
    if (EncodedReference.isEncodedReference(child)) {
      uris.add(EncodedReference.toURI(child));
      return child;
    }
    return recurse(child);
  });
  return [...uris];
};
