//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client } from '@dxos/client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import { FactStore, type FactStoreApi, FactStoreMemory } from '@dxos/pipeline-rdf';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { BrainCapabilities } from '#types';

/**
 * Each space's facts as a {@link FactStoreApi}, for surfaces and stories that read through one: every store is the
 * space's memory, which the client services host runs, so what they read is what operations wrote.
 */
export type FactStoreRegistry = {
  /** The space's memory as a FactStore. */
  forSpace: (spaceId: string) => FactStoreApi;
  /** A Layer providing `FactStore` over the space's memory. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore>;
  /**
   * Calls `listener` whenever the space's store applies a batch (a put, a reset, another device's writes); returns an
   * unsubscribe.
   */
  subscribe: (spaceId: string, listener: () => void) => () => void;
};

const spaceIdOf = (spaceId: string): SpaceId => {
  if (!SpaceId.isValid(spaceId)) {
    throw new TypeError(`Not a space id: ${spaceId}`);
  }
  return spaceId;
};

/** A registry over the client's space memories. */
export const makeFactStoreRegistry = (client: Client): FactStoreRegistry => {
  const forSpace = (spaceId: string): FactStoreApi => FactStoreMemory.make(client.memory(spaceIdOf(spaceId)));
  return {
    forSpace,
    layerFor: (spaceId) => Layer.succeed(FactStore, forSpace(spaceId)),
    subscribe: (spaceId, listener) => {
      const scope = Scope.makeUnsafe();
      void EffectEx.runPromise(client.rdf(spaceIdOf(spaceId)).listen(listener).pipe(Scope.provide(scope)));
      return () => void EffectEx.runPromise(Scope.close(scope, Exit.void));
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    return Capability.contribute(BrainCapabilities.FactStoreRegistry, makeFactStoreRegistry(client));
  }),
);
