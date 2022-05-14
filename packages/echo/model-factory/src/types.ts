//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import type { Codec } from '@dxos/codec-protobuf';
import { ItemID, MutationMetaWithTimeframe, WriteReceipt } from '@dxos/echo-protocol';

import { Model } from './model';
import { StateMachine } from './state-machine';

// TODO(burdon): Replace with DXN (push to core protocol def).
export type ModelType = string

// TODO(burdon): Rethink this concept. Remove static field.
export type ModelMeta<TState = any, TMutation = any, TSnasphot = any> = {
  type: ModelType

  // TODO(marik-d): Specify generic type param here to match model's expected message type.
  mutation: Codec<TMutation>

  snapshotCodec?: Codec<TSnasphot>

  stateMachine: () => StateMachine<TState, TMutation, TSnasphot>

  /**
   * A way to initialize the model upon item creation.
   * Must return a mutation that will initialize the model.
   * This mutation will be applied in the same processing step as the item creation.
   *
   * @param props User-defined props required for initialization. Forwarded from `database.createItem` call.
   * @returns A mutation to be included in the same message as item creation, or null if no initialization is required.
   */
  // TODO(burdon): Remove from meta? Make generic.
  getInitMutation? (props: any): Promise<any | null>
}

export type ModelConstructor<M extends Model> = (
  new (
    meta: ModelMeta,
    itemId: ItemID,
    getState: () => StateOf<M>,
    MutationWriter?: MutationWriter<MutationOf<M>>,
  ) => M
) & { meta: ModelMeta };

export type ModelMessage<T> = {
  meta: MutationMetaWithTimeframe,
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

export type MutationOf<M extends Model> = M extends Model<any, infer TMutation> ? TMutation : any;

export type StateOf<M extends Model> = M extends Model<infer TState, any> ? TState : any;

export interface MutationWriteReceipt extends WriteReceipt {
  waitToBeProcessed(): Promise<void>
}

export type MutationWriter<T> = (mutation: T) => Promise<MutationWriteReceipt>
