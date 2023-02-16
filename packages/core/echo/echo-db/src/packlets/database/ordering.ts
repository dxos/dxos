//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';
import { Timeframe } from '@dxos/timeframe';

export type MutationInQueue<T = any> = {
  /**
   * Decoded mutation for the model.
   */
  decodedModelMutation?: T;
  mutation: EchoObject.Mutation;
};

/**
 * Ensures strong ordering of a mutation queue.
 * If appending a new mutation would break the strong order, it returns the proper index to insert the new mutation.
 * Otherwise it returns `exising.length`.
 */
export const getInsertionIndex = (existing: MutationInQueue<unknown>[], newEntry: MutationInQueue<unknown>) => {
  let start = existing.length - 1;
  for (const ourKey = PublicKey.from(newEntry.mutation.meta!.feedKey!); start >= 0; start--) {
    if (ourKey.equals(existing[start].mutation.meta!.feedKey!)) {
      break;
    }
  }
  for (let i = start + 1; i < existing.length; i++) {
    const existingTimeframe = Timeframe.merge(
      existing[i].mutation.meta!.timeframe!,
      new Timeframe([[PublicKey.from(existing[i].mutation.meta!.feedKey!), existing[i].mutation.meta!.seq! - 1]])
    );

    const deps = Timeframe.dependencies(newEntry.mutation.meta!.timeframe!, existingTimeframe);
    if (deps.isEmpty()) {
      if (
        PublicKey.from(newEntry.mutation.meta!.feedKey!).toHex() <
        PublicKey.from(existing[i].mutation.meta!.feedKey!).toHex()
      ) {
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
  reorder: boolean;

  /**
   * This is a new mutation that needs to be processed by the state machine.
   * Set to `false` if this mutation confirms a previous optimistic mutation.
   */
  apply: boolean;
};

export class MutationQueue<T> {
  private _confirmed: MutationInQueue<T>[] = [];
  private _optimistic: MutationInQueue<T>[] = [];

  getConfirmedMutations(): MutationInQueue<T>[] {
    return this._confirmed;
  }

  getMutations(): MutationInQueue<T>[] {
    return [...this._confirmed, ...this._optimistic];
  }

  /**
   * Pushes optimistic mutation.
   * The mutation is always appended to the end of the queue.
   */
  pushOptimistic(entry: MutationInQueue<T>) {
    assert(entry.mutation.meta!.clientTag);
    this._optimistic.push(entry);
  }

  /**
   * Pushes confirmed mutation (coming for the pipeline).
   * Mutation must have feed metadata and timeframe dependencies.
   * Pops optimistic mutation with the same tag.
   */
  pushConfirmed(entry: MutationInQueue<T>): PushResult {
    assert(entry.mutation.meta!.feedKey);
    assert(typeof entry.mutation.meta!.seq === 'number');
    assert(entry.mutation.meta!.timeframe);

    // Remove optimistic mutation from the queue.
    const optimisticIndex = !entry.mutation.meta!.clientTag
      ? -1
      : this._optimistic.findIndex(
          (message) =>
            message.mutation.meta!.clientTag && message.mutation.meta!.clientTag === entry.mutation.meta!.clientTag
        );
    if (optimisticIndex !== -1) {
      this._optimistic.splice(optimisticIndex, 1);
    }

    const insertionIndex = getInsertionIndex(this._confirmed, entry);
    const lengthBefore = this._confirmed.length;
    this._confirmed.splice(insertionIndex, 0, entry);

    return {
      reorder:
        insertionIndex !== lengthBefore ||
        optimisticIndex > 0 ||
        (optimisticIndex === -1 && this._optimistic.length > 0),

      apply: optimisticIndex === -1
    };
  }

  resetConfirmed() {
    return (this._confirmed = []);
  }
}
