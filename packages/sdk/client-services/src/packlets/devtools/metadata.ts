//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { create } from '@dxos/protocols/buf';
import {
  type SubscribeToMetadataResponse,
  SubscribeToMetadataResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';

import { type ServiceContext } from '../services';

export const subscribeToMetadata = ({ context }: { context: ServiceContext }) =>
  new Stream<SubscribeToMetadataResponse>(({ next, ctx }) => {
    context.metadataStore.update.on(ctx, (data) =>
      next(create(SubscribeToMetadataResponseSchema, { metadata: data as never })),
    );
    next(create(SubscribeToMetadataResponseSchema, { metadata: context.metadataStore.metadata as never }));
  });
