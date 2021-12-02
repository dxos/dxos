//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedWriter, ItemID, MutationMeta, WriteReceipt } from '@dxos/echo-protocol';
import { createWritable } from '@dxos/feed-store';

import { ModelMessage, ModelMeta } from './types';
import { PublicKey } from '@dxos/crypto/dist';

export interface MutationWriteReceipt extends WriteReceipt {
  waitToBeProcessed(): Promise<void>
}

// TODO(burdon): CLean-up:
//   ModelMeta / registration (client.register and DXNS queries).
//   Simplify API + remove inheritance?
//   How to query/filter for items by type (of what?) Disambiguate item/model type from message type. Frames?
//   Minimal test (how to write models).

// TODO(burdon): Reset? rollback?
interface StateMachine<T> {
  state: () => T
  toJson: () => Promise<string>
  fromJson: (json: string) => Promise<void>
  processMessage: () => Promise<void>
}

interface Result<T> {
  optimistic: T | undefined
  ready: Promise<T> // Resolved once mutations have been processed.
}

// TODO(burdon): Example.

interface ChessState {
  players: {
    white: PublicKey
    black: PublicKey
  }
  fen: string
}

/*
// TODO(burdon): Distinguished from state machine.
// TODO(burdon): This requires a writablestream but isn't required by the pipeline.
interface ChessModel {
  state: ChessState
  setPlayers: (white: PublicKey, black: PublicKey) => Result<ChessState>
  applyMove: (move: any) => Result<ChessState>
}

// TODO(burdon): Object binding? Example query?
class ChessStateMachine implements StateMachine<ChessState> {}

class ChessModelImpl implements ChessModel {
  constructor (
    private readonly writableStream: NodeJS.WritableStream,
    private readonly
  ) {}
}

const test = (Item<ChessModel>) => item.model.state.fen;
*/

/**
 * Abstract base class for Models.
 * Models define a root message type, which is contained in the parent Item's message envelope.
 */
export abstract class Model<T = any> {
  public readonly update = new Event<Model<T>>();

  private readonly _processor: NodeJS.WritableStream;

  private readonly _meta: ModelMeta;
  private readonly _itemId: ItemID;
  private readonly _writeStream?: FeedWriter<T>;

  private readonly _messageProcessed = new Event<MutationMeta>()

  /**
   * @param meta
   * @param itemId Parent item.
   * @param writeStream Output mutation stream (unless read-only).
   */
  constructor (meta: ModelMeta, itemId: ItemID, writeStream?: FeedWriter<T>) {
    assert(meta);
    assert(itemId);
    this._meta = meta;
    this._itemId = itemId;
    this._writeStream = writeStream;

    // Create the input mutation stream.
    this._processor = createWritable<ModelMessage<T>>(async message => {
      const { meta, mutation } = message;
      assert(meta);
      assert(mutation);

      await this.processMessage(meta, mutation);
    });
  }

  toString () {
    return `Model(${JSON.stringify(this.toJSON())})`;
  }

  /**
   * Overriden to not retun implementation details.
   */
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

  // TODO(burdon): Standardize (vs. isReadOnly methods in database).
  get readOnly (): boolean {
    return this._writeStream === undefined;
  }

  /**
   * @deprecated Use processMessage.
   */
  // TODO(burdon): Rename.
  get processor (): NodeJS.WritableStream {
    return this._processor;
  }

  subscribe (listener: (result: this) => void) {
    return this.update.on(listener as any);
  }

  async processMessage (meta: MutationMeta, message: T): Promise<void> {
    const modified = await this._processMessage(meta, message);
    if (modified) {
      this.update.emit(this);
    }

    this._messageProcessed.emit(meta);
  }

  createSnapshot (): any {
    throw new Error('This model does not support snapshots.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async restoreFromSnapshot (snapshot: any): Promise<void> {
    throw new Error('This model does not support snapshots');
  }

  // TODO(burdon): Update public, private, protected.

  /**
   * Writes the raw mutation to the output stream.
   * @param mutation
   */
  protected async write (mutation: T): Promise<MutationWriteReceipt> {
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

  /**
   * Process the message.
   * @abstract
   * @param {Object} meta
   * @param {Object} message
   */
  protected abstract _processMessage (meta: MutationMeta, message: T): Promise<boolean>;
}
