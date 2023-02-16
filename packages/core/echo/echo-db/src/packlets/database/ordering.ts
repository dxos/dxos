//
// Copyright 2022 DXOS.org
//

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { ModelMessage } from '@dxos/model-factory';
import { MutationMeta } from '@dxos/protocols/src/proto/gen/dxos/echo/object';
import { Timeframe } from '@dxos/timeframe';
import assert from 'node:assert';

export type MutationInQueue<T> = {
  /**
   * Decoded mutation for the model.
   */
  mutation: T;
  meta: MutationMeta
};

/**
 * Ensures strong ordering of a mutation queue.
 * If appending a new mutation would break the strong order, it returns the proper index to insert the new mutation.
 * Otherwise it returns `exising.length`.
 */
export const getInsertionIndex = (existing: MutationInQueue<any>[], newMutation: MutationInQueue<any>) => {
  let start = existing.length - 1;
  for (const ourKey = PublicKey.from(newMutation.meta.feedKey!); start >= 0; start--) {
    if (ourKey.equals(existing[start].meta.feedKey!)) {
      break;
    }
  }
  for (let i = start + 1; i < existing.length; i++) {
    const existingTimeframe = Timeframe.merge(
      existing[i].meta.timeframe!,
      new Timeframe([[PublicKey.from(existing[i].meta.feedKey!), existing[i].meta.seq! - 1]])
    );

    const deps = Timeframe.dependencies(newMutation.meta.timeframe!, existingTimeframe);
    if (deps.isEmpty()) {
      if (PublicKey.from(newMutation.meta.feedKey!).toHex() < PublicKey.from(existing[i].meta.feedKey!).toHex()) {
        return i;
      }
    }
  }

  return existing.length;
};

export type PushResult = {
  /**
   * Order of mutations has changed.
   */
  reorder: boolean

  /**
   * This is a new mutation that needs to be processed by the state machine.
   * Set to `false` if this mutation confirms a previous optimistic mutation.
   */
  apply: boolean
}

export class MutationQueue<T> {
  private _confirmed: MutationInQueue<T>[] = [];
  private _optimistic: MutationInQueue<T>[] = [];

  getConfirmedMutations(): MutationInQueue<T>[] {
    return this._confirmed;
  }

  getMutations(): MutationInQueue<T>[] {
    return [
      ...this._confirmed,
      ...this._optimistic,
    ]
  }

  /**
   * Pushes optimistic mutation.
   * The mutation is always appended to the end of the queue.
   */
  pushOptimistic(mutation: MutationInQueue<T>) {
    assert(mutation.meta.clientTag);
    this._optimistic.push(mutation);
  }

  /**
   * Pushes confirmed mutation (coming for the pipeline).
   * Mutation must have feed metadata and timeframe dependencies.
   * Pops optimistic mutation with the same tag.
   */
  pushConfirmed(mutation: MutationInQueue<T>): PushResult {
    // Remove optimistic mutation from the queue.
    const optimisticIndex = !mutation.meta.clientTag ? -1 : this._optimistic.findIndex((message) => message.meta.clientTag && message.meta.clientTag === mutation.meta.clientTag);
    if (optimisticIndex !== -1) {
      this._optimistic.splice(optimisticIndex, 1);
    }

    const insertionIndex = getInsertionIndex(this._confirmed, mutation);
    const lengthBefore = this._confirmed.length;
    this._confirmed.splice(insertionIndex, 0, mutation);

    return {
      reorder: insertionIndex !== lengthBefore ||
        optimisticIndex > 0 ||
        (optimisticIndex === -1 && this._optimistic.length > 0),

      apply: optimisticIndex === -1
    }
  }

  resetConfirmed() {
    return this._confirmed = [];
  }
}