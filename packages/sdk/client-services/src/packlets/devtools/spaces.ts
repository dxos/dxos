//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { fromPublicKey, fromTimeframe } from '@dxos/protocols/buf';
import {
  type SubscribeToSpacesResponse,
  type SubscribeToSpacesResponse_SpaceInfo,
  SubscribeToSpacesResponseSchema,
  SubscribeToSpacesResponse_SpaceInfoSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type DevtoolsHost } from '@dxos/protocols/rpc';

import { type ServiceContext } from '../services';
import { type Space } from '../space';

export const subscribeToSpaces = (
  context: ServiceContext,
  { spaceKeys = [] }: DevtoolsHost.SubscribeToSpacesRequest,
): EffectStream.Stream<SubscribeToSpacesResponse, Error> => {
  return EffectEx.streamFromEmitter<SubscribeToSpacesResponse, Error>((emit) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...context.spaceManager!.spaces.values()];
      const filteredSpaces = spaces.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key)),
      );

      emit.single(
        create(SubscribeToSpacesResponseSchema, {
          spaces: filteredSpaces.map((space): SubscribeToSpacesResponse_SpaceInfo => {
            const spaceMetadata = context.metadataStore.spaces.find((spaceMetadata: SpaceMetadata) =>
              spaceMetadata.key.equals(space.key),
            );

            return create(SubscribeToSpacesResponse_SpaceInfoSchema, {
              key: fromPublicKey(space.key),
              isOpen: space.isOpen,
              timeframe: spaceMetadata?.dataTimeframe && fromTimeframe(spaceMetadata.dataTimeframe),
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
      await context.initialized.wait();
      unsubscribe = context.dataSpaceManager!.updated.on(() => update());

      // Send initial spaces.
      await update();
    });

    return Effect.sync(() => {
      unsubscribe?.();
      clearTimeout(timeout);
    });
  });
};
