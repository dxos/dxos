//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { type SubscribeToMetadataResponse } from '@dxos/protocols/proto/dxos/devtools/host';

import { type ServiceContext } from '../services';

export const subscribeToMetadata = ({ context }: { context: ServiceContext }) =>
  new Stream<SubscribeToMetadataResponse>(({ next, ctx }) => {
    context.metadataStore.update.on(ctx, (data) => next({ metadata: data }));
    next({ metadata: context.metadataStore.metadata });
  });
