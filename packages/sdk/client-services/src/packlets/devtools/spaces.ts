//
// Copyright 2020 DXOS.org
//

import { type Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import {
  type SubscribeToSpacesRequest,
  type SubscribeToSpacesResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { type IMetadataStore } from '../metadata';
import { type Space, type SpaceManager } from '../space';
import { type DataSpaceManager } from '../spaces';

type SpacesContext = {
  readonly initialized: Trigger;
  readonly spaceManager: SpaceManager;
  readonly metadataStore: IMetadataStore;
  readonly dataSpaceManager?: DataSpaceManager;
};

export const subscribeToSpaces = (context: SpacesContext, { spaceKeys = [] }: SubscribeToSpacesRequest) => {
  return new Stream<SubscribeToSpacesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...context.spaceManager.spaces.values()];
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
      // DataSpaceManager is present once identity-bound services have opened; guard for the
      // pre-identity / partially-initialised case rather than asserting.
      if (context.dataSpaceManager) {
        unsubscribe = context.dataSpaceManager.updated.on(() => update());
      }

      // Send initial spaces.
      await update();
    });

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  });
};
