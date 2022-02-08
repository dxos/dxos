//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedWriter, ItemID, MutationMeta, WriteReceipt } from '@dxos/echo-protocol';
import { createWritable } from '@dxos/feed-store';

import { StateMachine } from './state-machine';
import { ModelMessage, ModelMeta } from './types';

export interface MutationWriteReceipt extends WriteReceipt {
  waitToBeProcessed(): Promise<void>
}

/**
 * Abstract base class for Models.
 * Models define a root message type, which is contained in the parent Item's message envelope.
 */
export abstract class Model<TState = any, TMutation = any> {
  public readonly update = new Event<Model<TState, TMutation>>();

  private readonly _meta: ModelMeta;
  private readonly _itemId: ItemID;
  private readonly _writeStream?: FeedWriter<TMutation>;

  /**
   * @intertal
   */
  public readonly _messageProcessed = new Event<MutationMeta>();

  protected readonly _getState: () => TState;

  /**
   * @param meta
   * @param itemId Parent item.
   * @param writeStream Output mutation stream (unless read-only).
   */
  constructor (
    meta: ModelMeta,
    itemId: ItemID,
    getState: () => TState,
    writeStream?: FeedWriter<TMutation>,
  ) {
    assert(meta);
    assert(itemId);
    this._meta = meta;
    this._itemId = itemId;
    this._writeStream = writeStream;
    this._getState = getState;
  }

  //
  // Model
  //

  toString () {
    return `Model(${JSON.stringify(this.toJSON())})`;
  }

  toJSON () {
    return {
      id: this.itemId,
      type: this._meta.type
    };
  }

  get modelMeta (): ModelMeta {
    return this._meta;
  }

  get itemId (): ItemID {
    return this._itemId;
  }

  get readOnly (): boolean {
    return this._writeStream === undefined;
  }

  subscribe (listener: (result: this) => void) {
    return this.update.on(listener as any);
  }

  /**
   * Writes the raw mutation to the output stream.
   */
  protected async write (mutation: TMutation): Promise<MutationWriteReceipt> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    // Promise that resolves when this mutation has been processed.
    const processed = this._messageProcessed.waitFor(meta =>
      receipt.feedKey.equals(meta.feedKey) && meta.seq === receipt.seq
    );

    const receipt = await this._writeStream.write(mutation);
    return {
      ...receipt,
      waitToBeProcessed: async () => {
        await processed;
      }
    };
  }
}
