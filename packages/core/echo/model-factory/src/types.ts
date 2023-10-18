//
// Copyright 2020 DXOS.org
//

import type { Codec } from '@dxos/codec-protobuf';
import type { WriteReceipt } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import type { ItemID, MutationMetaWithTimeframe } from '@dxos/protocols';

import { type Model } from './model';

// TODO(burdon): Replace with DXN (push to core protocol def).
export type ModelType = string;

// TODO(burdon): Document.
export type StateOf<M extends Model> = M extends Model<infer TState, any> ? TState : any;

// TODO(burdon): Document.
export type MutationOf<M extends Model> = M extends Model<any, infer TMutation> ? TMutation : any;

/**
 *
 */
export type ModelMessage<T> = {
  meta: MutationMetaWithTimeframe;
  mutation: T;
};

export interface MutationWriteReceipt extends WriteReceipt {
  waitToBeProcessed(): Promise<void>;
}

export type MutationWriter<T> = (mutation: T) => Promise<MutationWriteReceipt>;

/**
 * Manages state and state transitions vis mutations.
 */
export interface StateMachine<TState, TMutation, TSnapshot> {
  /**
   * @returns Current state.
   */
  getState(): TState;

  /**
   * Resets the state to the given snapshot.
   * @param snapshot Snapshot to reset to.
   */
  reset(snapshot: TSnapshot): void;

  /**
   * Applies a mutation to the state.
   * @param mutation Mutation to apply.
   */
  process(mutation: TMutation): void;

  /**
   * @returns Snapshot of the current state.
   */
  snapshot(): TSnapshot;
}

/**
 * Model configuration.
 */
// TODO(burdon): Rethink this concept. Remove static field from model.
export type ModelMeta<TState = any, TMutation = any, TSnasphot = any> = {
  type: ModelType;

  // TODO(dmaretskyi): Specify generic type param here to match model's expected message type.
  mutationCodec: Codec<TMutation>;

  // Snapshot codecs are distinct from the mutation codecs.
  snapshotCodec?: Codec<TSnasphot>;

  // Merge Mutations
  mergeMutations?: (mutations: TMutation[]) => TMutation;

  // Manages state and state transitions vis mutations.
  stateMachine: () => StateMachine<TState, TMutation, TSnasphot>;
};

/**
 *
 */
export type ModelConstructor<M extends Model> = (new (
  meta: ModelMeta,
  itemId: ItemID, // TODO(burdon): Rename objectId.
  getState: () => StateOf<M>,
  MutationWriter?: MutationWriter<MutationOf<M>>,
) => M) & {
  meta: ModelMeta;
};

/**
 *
 */
// eslint-disable-next-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
export function validateModelClass(model: any): asserts model is ModelConstructor<any> {
  invariant(typeof model === 'function');

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
