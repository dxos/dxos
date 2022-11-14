//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Space } from '@dxos/echo-db';
import { SubscribeToSpacesRequest, SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, { spaceKeys = [] }: SubscribeToSpacesRequest) =>
  new Stream<SubscribeToSpacesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...context.spaceManager!.spaces.values()];
      const filteredSpaces = spaces.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key))
      );

      next({
        spaces: filteredSpaces.map((space) => {
          const spaceMetadata = context.metadataStore.spaces.find((spaceMetadata: SpaceMetadata) =>
            spaceMetadata.key.equals(space.key)
          );

          return {
            key: space.key,
            isOpen: space.isOpen,
            timeframe: spaceMetadata!.latestTimeframe!,
            genesisFeed: space.genesisFeedKey,
            controlFeed: space.controlFeedKey,
            dataFeed: space.dataFeedKey
          };
        })
      });
    };

    setImmediate(async () => {
      console.log('waiting for init');
      await context.initialized.wait();
      console.log('initialized');
      unsubscribe = context.spaceManager!.updated.on(() => update());

      // Send initial spaces.
      await update();
    });

    return () => {
      unsubscribe?.();
    };
  });
