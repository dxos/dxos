//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { type SubscribeToMetadataResponse } from '@dxos/protocols/proto/dxos/devtools/host';

import { type ServiceContext } from '../services';

export const subscribeToMetadata = ({
  context,
}: {
  context: ServiceContext;
}): EffectStream.Stream<SubscribeToMetadataResponse, Error> =>
  EffectEx.streamFromEmitter<SubscribeToMetadataResponse, Error>((emit) => {
    const ctx = Context.default();
    context.metadataStore.update.on(ctx, (data) => emit.single({ metadata: data }));
    emit.single({ metadata: context.metadataStore.metadata });

    return Effect.promise(() => ctx.dispose());
  });
