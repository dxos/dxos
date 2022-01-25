//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import type { Codec } from '@dxos/codec-protobuf';
import { MutationMeta, ItemID, FeedWriter } from '@dxos/echo-protocol';

import { StateMachine } from './state-machiene';

//
// Types.
//

export type ModelType = string // TODO(burdon): Replace with DXN.

export type ModelMeta<TState = any, TMutation = any, TSnasphot = any> = {
  type: ModelType

  // TODO(burdon): Rename.
  // TODO(marik-d): Specify generic type param here to match model's expected message type.
  mutation: Codec<TMutation>

  snapshotCodec?: Codec<TSnasphot>

  stateMachine: () => StateMachine<TState, TMutation, TSnasphot>

  /**
   * A way to initialize the model upon item creation.
   *
   * Must return a mutation that will initialize the model.
   * This mutation will be applied in the same processing step as the item creation.
   *
   * @param props User-defined props required for initialization. Forwarded from `database.createItem` call.
   * @returns A mutation to be included in the same message as item creation, or null if no initialization is required.
   */
  // TODO(burdon): Remove from meta? Make generic.
  getInitMutation? (props: any): Promise<any | null>
}

export type ModelConstructor<T> = (new (meta: ModelMeta, itemId: ItemID, writeStream?: FeedWriter<any>) => T) &
  { meta: ModelMeta };

export type ModelMessage<T> = {
  meta: MutationMeta,
  mutation: T
}

export function validateModelClass (model: any): asserts model is ModelConstructor<any> {
  assert(typeof model === 'function');
  // TODO(burdon): Convert to assert (too verbose).
  if (!model.meta) {
    throw new TypeError('Invalid model: missing static `meta` field.');
  }
  if (!model.meta.type) {
    throw new TypeError('Invalid model: missing type URL.');
  }
  if (!model.meta.mutation) {
    throw new TypeError('Invalid model: missing mutation codec.');
  }
}
