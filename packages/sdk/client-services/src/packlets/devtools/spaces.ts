//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type Space } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { create, protoToBuf } from '@dxos/protocols/buf';
import {
  type SubscribeToSpacesRequest,
  type SubscribeToSpacesResponse,
  type SubscribeToSpacesResponse_SpaceInfo,
  SubscribeToSpacesResponseSchema,
  SubscribeToSpacesResponse_SpaceInfoSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { type ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, request: SubscribeToSpacesRequest) => {
  const spaceKeys = request.spaceKeys?.map((k) => PublicKey.from(k.data));
  return new Stream<SubscribeToSpacesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const spaces: Space[] = [...context.spaceManager!.spaces.values()];
      const filteredSpaces = spaces.filter(
        (space) => !spaceKeys?.length || spaceKeys.some((spaceKey) => spaceKey.equals(space.key)),
      );

      next(
        create(SubscribeToSpacesResponseSchema, {
          spaces: filteredSpaces.map((space) => {
            const spaceMetadata = context.metadataStore.spaces.find((spaceMetadata: SpaceMetadata) =>
              spaceMetadata.key.equals(space.key),
            );

            return create(SubscribeToSpacesResponse_SpaceInfoSchema, {
              key: create(PublicKeySchema, { data: space.key.asUint8Array() }),
              isOpen: space.isOpen,
              timeframe: protoToBuf<SubscribeToSpacesResponse_SpaceInfo['timeframe']>(spaceMetadata?.dataTimeframe),
              genesisFeed: create(PublicKeySchema, { data: space.genesisFeedKey.asUint8Array() }),
              controlFeed: space.controlFeedKey
                ? create(PublicKeySchema, { data: space.controlFeedKey.asUint8Array() })
                : undefined,
              dataFeed: space.dataFeedKey
                ? create(PublicKeySchema, { data: space.dataFeedKey.asUint8Array() })
                : undefined,
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

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  });
};
