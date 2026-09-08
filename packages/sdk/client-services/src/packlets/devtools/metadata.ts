//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { buf } from '@dxos/protocols/buf';
import { encodeCompat } from '@dxos/protocols/buf-shape-compat';
import {
  type SubscribeToMetadataResponse,
  SubscribeToMetadataResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type EchoMetadata } from '@dxos/protocols/buf/dxos/echo/metadata_pb';

import { type ServiceContext } from '../services';

/** The metadata store keeps the protobuf.js shape, which crosses to buf as the shared wire bytes. */
const toBufResponse = (metadata: EchoMetadata): SubscribeToMetadataResponse =>
  buf.fromBinary(SubscribeToMetadataResponseSchema, encodeCompat(SubscribeToMetadataResponseSchema, { metadata }));

export const subscribeToMetadata = ({
  context,
}: {
  context: ServiceContext;
}): EffectStream.Stream<SubscribeToMetadataResponse, Error> =>
  EffectEx.streamFromEmitter<SubscribeToMetadataResponse, Error>((emit) => {
    const ctx = Context.default();
    context.metadataStore.update.on(ctx, (data) => emit.single(toBufResponse(data)));
    emit.single(toBufResponse(context.metadataStore.metadata));

    return Effect.promise(() => ctx.dispose());
  });
