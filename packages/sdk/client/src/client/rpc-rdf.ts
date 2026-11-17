//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type ClientServicesRpc } from '@dxos/client-protocol';
import * as RdfStore from '@dxos/echo-memory/RdfStore';
import { type SpaceId } from '@dxos/keys';

/**
 * A space's {@link RdfStore.Service} served by the client services host, which keeps the quads in its own database and
 * logs every shared write to the space's fact feed. `getRpc` is read per call because a reconnect to a new worker
 * replaces the RPC proxy.
 */
export const createRpcRdfStore = (getRpc: () => ClientServicesRpc, spaceId: SpaceId): RdfStore.Service => {
  const call = <A>(message: string, effect: Effect.Effect<A, unknown>): Effect.Effect<A, RdfStore.RdfStoreError> =>
    effect.pipe(Effect.mapError(RdfStore.RdfStoreError.wrap({ message, ifTypeDiffers: true })));

  return {
    query: (sparql, options) =>
      call(
        'Query failed',
        Effect.suspend(() => getRpc()['RdfStoreService.query']({ spaceId, sparql, local: options?.local })).pipe(
          Effect.map(({ rows }) => rows),
        ),
      ),
    write: (writes, options) =>
      call(
        'Write failed',
        Effect.suspend(() => getRpc()['RdfStoreService.write']({ spaceId, writes, local: options?.local })).pipe(
          Effect.map(({ id }) => id),
        ),
      ),
    export: (format) =>
      call(
        'Export failed',
        Effect.suspend(() => getRpc()['RdfStoreService.export']({ spaceId, format })).pipe(
          Effect.map(({ data }) => data),
        ),
      ),
    import: (data, format) =>
      call(
        'Import failed',
        Effect.suspend(() => getRpc()['RdfStoreService.import']({ spaceId, data, format })).pipe(
          Effect.map(({ id }) => id),
        ),
      ),
    // Across RPC the subscription starts once the host answers, so a batch the host applies before then is not seen.
    listen: (onApplied) =>
      Effect.forkScoped(
        Stream.suspend(() => getRpc()['RdfStoreService.changes']({ spaceId })).pipe(
          Stream.runForEach((batch) => Effect.sync(() => onApplied(batch))),
          Effect.catchCause((cause) => Effect.logError('The RDF store change feed ended', cause)),
        ),
      ).pipe(Effect.asVoid),
  };
};
