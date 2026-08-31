//
// Copyright 2020 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { type SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
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

      emit.single({
        spaces: filteredSpaces.map((space): SubscribeToSpacesResponse.SpaceInfo => {
          const spaceMetadata = context.metadataStore.spaces.find((spaceMetadata: SpaceMetadata) =>
            spaceMetadata.key.equals(space.key),
          );

          return {
            key: space.key,
            isOpen: space.isOpen,
            timeframe: spaceMetadata?.dataTimeframe,
            genesisFeed: space.genesisFeedKey,
            controlFeed: space.controlFeedKey!, // TODO(dmaretskyi): Those keys may be missing.
            dataFeed: space.dataFeedKey!,
          };
        }),
      });
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
