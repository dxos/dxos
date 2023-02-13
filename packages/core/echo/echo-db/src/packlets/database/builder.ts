//
// Copyright 2023 DXOS.org
//

import { Any, ProtoCodec, WithTypeUrl } from '@dxos/codec-protobuf';
import { ModelMeta } from '@dxos/model-factory';
import { EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';

/**
 * Assigns a unique tag to each mutation in a batch with proper indexing.
 */
export const tagMutationsInBatch = (batch: EchoObjectBatch, tag: string) => {
  batch.objects?.forEach((object, objectIndex) => {
    object.mutations?.forEach((mutation, mutationIndex) => {
      mutation.meta ??= {};
      mutation.meta.clientTag = `${tag}:${objectIndex}:${mutationIndex}`;
    });
  });
};

export const createModelMutation = (objectId: string, mutation: Any): EchoObjectBatch => ({
  objects: [
    {
      objectId,
      mutations: [
        {
          model: mutation
        }
      ]
    }
  ]
});

export const encodeModelMutation = (meta: ModelMeta, mutation: any): WithTypeUrl<Any> =>
  (meta.mutationCodec as ProtoCodec).encodeAsAny(mutation);

export const genesisMutation = (objectId: string, modelType: string) => ({
  objects: [{ objectId, genesis: { modelType } }]
});
