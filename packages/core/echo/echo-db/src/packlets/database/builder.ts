//
// Copyright 2023 DXOS.org
//

import { type Any, type ProtoCodec, type WithTypeUrl } from '@dxos/codec-protobuf';
import { type ModelMeta } from '@dxos/model-factory';
import { type EchoObject, type EchoObjectBatch, type MutationMeta } from '@dxos/protocols/proto/dxos/echo/object';

/**
 * Assigns a unique tag to each mutation in a batch with proper indexing.
 */
export const tagMutationsInBatch = (batch: EchoObjectBatch, tag: string, startingIndex: number) => {
  batch.objects?.forEach((object, objectIndex) => {
    object.meta ??= {};
    object.meta.clientTag = [`${tag}:${objectIndex}`];

    object.mutations?.forEach((mutation, mutationIndex) => {
      mutation.meta ??= {};
      mutation.meta.clientTag = [`${tag}:${objectIndex + startingIndex}:${mutationIndex}`];
    });
  });
};

/**
 * Assigns metadata to object message and every mutation.
 */
export const setMetadataOnObject = (object: EchoObject, meta: MutationMeta) => {
  object.meta = meta;

  object.mutations?.forEach((mutation) => {
    mutation.meta = meta;
  });
};

export const createModelMutation = (objectId: string, mutation: Any): EchoObjectBatch => ({
  objects: [
    {
      objectId,
      mutations: [
        {
          model: mutation,
        },
      ],
    },
  ],
});

export const encodeModelMutation = (meta: ModelMeta, mutation: any): WithTypeUrl<Any> =>
  (meta.mutationCodec as ProtoCodec).encodeAsAny(mutation);

export const genesisMutation = (objectId: string, modelType: string) => ({
  objects: [{ objectId, genesis: { modelType } }],
});
