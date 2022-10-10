//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import type { ItemID } from '@dxos/protocols';

import { ModelMeta, MutationWriteReceipt, MutationWriter } from './types.js';

/**
 * Abstract base class for Models.
 * Models define a root message type, which is contained in the parent Item's message envelope.
 */
export abstract class Model<TState = any, TMutation = any> {
  public readonly update = new Event<Model<TState, TMutation>>();

  /**
   * @param _meta Metadata definitions.
   * @param _itemId Parent item.
   * @param _getState Retrieves the underlying state object.
   * @param _mutationWriter Output mutation stream (unless read-only).
   */
  constructor (
    private readonly _meta: ModelMeta,
    private readonly _itemId: ItemID,
    protected readonly _getState: () => TState,
    private readonly _mutationWriter?: MutationWriter<TMutation>
  ) {}

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
    return this._mutationWriter === undefined;
  }

  subscribe (listener: (result: this) => void) {
    return this.update.on(listener as any);
  }

  /**
   * Writes the raw mutation to the output stream.
   */
  protected async write (mutation: TMutation): Promise<MutationWriteReceipt> {
    if (!this._mutationWriter) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    return this._mutationWriter(mutation);
  }
}
