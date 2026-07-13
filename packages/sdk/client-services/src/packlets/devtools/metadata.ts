//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type IMetadataStore } from '@dxos/echo-host';
import { type SubscribeToMetadataResponse } from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToMetadata = ({ context }: { context: { metadataStore: IMetadataStore } }) =>
  new Stream<SubscribeToMetadataResponse>(({ next, ctx }) => {
    context.metadataStore.update.on(ctx, (data) => next({ metadata: data }));
    next({ metadata: context.metadataStore.metadata });
  });
