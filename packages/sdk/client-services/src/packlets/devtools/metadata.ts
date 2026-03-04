//
// Copyright 2023 DXOS.org
//
import { create } from '@dxos/protocols/buf';
import {
  type SubscribeToMetadataResponse,
  SubscribeToMetadataResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { Stream } from '@dxos/stream';

import { type ServiceContext } from '../services';

export const subscribeToMetadata = ({ context }: { context: ServiceContext }) =>
  new Stream<SubscribeToMetadataResponse>(({ next, ctx }) => {
    context.metadataStore.update.on(ctx, (data) => next(create(SubscribeToMetadataResponseSchema, { metadata: data })));
    next(create(SubscribeToMetadataResponseSchema, { metadata: context.metadataStore.metadata }));
  });
