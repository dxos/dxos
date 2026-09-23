//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { type Trigger } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { fromPublicKey, requirePublicKey } from '@dxos/protocols/buf';
import {
  type SubscribeToSpacesResponse,
  type SubscribeToSpacesResponse_SpaceInfo,
  SubscribeToSpacesResponse_SpaceInfoSchema,
  SubscribeToSpacesResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SpaceMetadata } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { type DevtoolsHost } from '@dxos/protocols/rpc';

import * as SpacesContract from '../../contracts/spaces.ts';
import { type IMetadataStore } from '../metadata/index.ts';
import { type Space, type SpaceManager } from '../space/index.ts';

export const subscribeToSpaces = (
  {
    spaceManager,
    metadataStore,
    dataSpaceManager,
    initialized,
  }: {
    spaceManager: SpaceManager;
    metadataStore: IMetadataStore;
    dataSpaceManager: SpacesContract.Manager;
    initialized: Trigger;
  },
  { spaceKeys = [] }: DevtoolsHost.SubscribeToSpacesRequest,
): EffectStream.Stream<SubscribeToSpacesResponse, Error> => {
  return EffectEx.streamFromEmitter<SubscribeToSpacesResponse, Error>((emit) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...spaceManager.spaces.values()];
      const filteredSpaces = spaces.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key)),
      );

      emit.single(
        create(SubscribeToSpacesResponseSchema, {
          spaces: filteredSpaces.map((space): SubscribeToSpacesResponse_SpaceInfo => {
            const spaceMetadata = metadataStore.spaces.find(
              (spaceMetadata: SpaceMetadata) =>
                spaceMetadata.key && requirePublicKey(spaceMetadata.key).equals(space.key),
            );

            return create(SubscribeToSpacesResponse_SpaceInfoSchema, {
              key: fromPublicKey(space.key),
              isOpen: space.isOpen,
              timeframe: spaceMetadata?.dataTimeframe,
              genesisFeed: fromPublicKey(space.genesisFeedKey),
              // The write feeds are absent until the space is opened for writing; buf makes that
              // presence explicit where the protobuf.js shape let it pass as a non-null assertion.
              controlFeed: space.controlFeedKey && fromPublicKey(space.controlFeedKey),
              dataFeed: space.dataFeedKey && fromPublicKey(space.dataFeedKey),
            });
          }),
        }),
      );
    };

    const timeout = setTimeout(async () => {
      await initialized.wait();
      unsubscribe = dataSpaceManager.updated.on(() => update());

      // Send initial spaces.
      await update();
    });

    return Effect.sync(() => {
      unsubscribe?.();
      clearTimeout(timeout);
    });
  });
};
