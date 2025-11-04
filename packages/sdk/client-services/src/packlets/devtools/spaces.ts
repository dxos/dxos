//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type Space } from '@dxos/echo-pipeline';
import {
  type SubscribeToSpacesRequest,
  type SubscribeToSpacesResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { type ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, { spaceKeys = [] }: SubscribeToSpacesRequest) =>
  new Stream<SubscribeToSpacesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...context.spaceManager!.spaces.values()];
      const filteredSpaces = spaces.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key)),
      );

      next({
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

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  });
