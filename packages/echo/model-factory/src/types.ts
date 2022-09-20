//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import type { Codec } from '@dxos/codec-protobuf';
import type { ItemID, MutationMetaWithTimeframe, WriteReceipt } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';

import { Model } from './model';

// TODO(burdon): Replace with DXN (push to core protocol def).
export type ModelType = string

// TODO(burdon): Document.
export type StateOf<M extends Model> = M extends Model<infer TState, any> ? TState : any

// TODO(burdon): Document.
export type MutationOf<M extends Model> = M extends Model<any, infer TMutation> ? TMutation : any

/**
 *
 */
export type ModelMessage<T> = {
  meta: MutationMetaWithTimeframe
  mutation: T
}

export interface MutationWriteReceipt extends WriteReceipt {
  waitToBeProcessed(): Promise<void>
}

export type MutationWriter<T> = (mutation: T) => Promise<MutationWriteReceipt>

/**
 *
 */
// TODO(burdon): Rename and document.
export interface MutationProcessMeta {
  author: PublicKey
}

/**
 * Manages state and state transitions vis mutations.
 */
export interface StateMachine<TState, TMutation, TSnapshot> {
  getState(): TState
  reset(snapshot: TSnapshot): void
  process(mutation: TMutation, meta: MutationProcessMeta): void
  snapshot(): TSnapshot
}

/**
 * Model configuration.
 */
// TODO(burdon): Rethink this concept. Remove static field from model.
export type ModelMeta<TState = any, TMutation = any, TSnasphot = any> = {
  type: ModelType

  // TODO(marik-d): Specify generic type param here to match model's expected message type.
  mutationCodec: Codec<TMutation>

  // Snapshot codecs are distinct from the mutation codecs.
  snapshotCodec?: Codec<TSnasphot>

  // Manages state and state transitions vis mutations.
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

/**
 *
 */
export type ModelConstructor<M extends Model> = (
  new (
    meta: ModelMeta,
    itemId: ItemID,
    getState: () => StateOf<M>,
    MutationWriter?: MutationWriter<MutationOf<M>>,
  ) => M
) & {
  meta: ModelMeta
};

/**
 *
 */
// eslint-disable-next-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
export function validateModelClass (model: any): asserts model is ModelConstructor<any> {
  assert(typeof model === 'function');

  // TODO(burdon): Convert to assert (too verbose).
  if (!model.meta) {
    throw new TypeError('Invalid model: missing static `meta` field.');
  }
  if (!model.meta.type) {
    throw new TypeError('Invalid model: missing type URL.');
  }
  if (!model.meta.mutationCodec) {
    throw new TypeError('Invalid model: missing mutation codec.');
  }
}
