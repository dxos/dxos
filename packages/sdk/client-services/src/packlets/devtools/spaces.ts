//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Space } from '@dxos/echo-db';
import { SubscribeToPartiesRequest, SubscribeToPartiesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, { spaceKeys = [] }: SubscribeToPartiesRequest) =>
  new Stream<SubscribeToPartiesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const parties: Space[] = [...context.spaceManager!.spaces.values()];
      const filteredParties = parties.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key))
      );

      next({
        parties: filteredParties.map((space) => {
          const spaceMetadata = context.metadataStore.parties.find((spaceMetadata: SpaceMetadata) =>
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
      await context.initialized.wait();
      unsubscribe = context.spaceManager!.updated.on(() => update());

      // Send initial parties.
      await update();
    });

    return () => {
      unsubscribe?.();
    };
  });
