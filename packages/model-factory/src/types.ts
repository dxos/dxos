//
// Copyright 2020 DXOS.org
//

import { MutationMeta, ItemID, FeedWriter } from '@dxos/echo-protocol';

export interface Codec<T> {
  encode(value: T): Uint8Array
  decode(data: Uint8Array): T
}

//
// Types
//

export type ModelType = string;

export type ModelMeta = {
  type: ModelType,
  mutation: Codec<any> // TODO(marik-d): Specify generic type param here to match model's expected message type

  /**
   * A way to initialize the model upon item creation.
   *
   * Must return a mutation that will initialize the model.
   * This mutation will be applied in the same processing cycle as the item creation.
   *
   * @param props User-defined props required for initialization. Forwarded from `database.createItem` call.
   * @returns A mutation to be included in the same message as item creation, or null if no initialization is required.
   */
  getInitMutation? (props: any): Promise<any | null>

  snapshotCodec?: Codec<any>
}

export type ModelConstructor<T> =
  (new (meta: ModelMeta, itemId: ItemID, writeStream?: FeedWriter<any>) => T) & { meta: ModelMeta };

export type ModelMessage<T> = {
  meta: MutationMeta,
  mutation: T
}

export function validateModelClass (model: any): asserts model is ModelConstructor<any> {
  if (typeof model !== 'function') {
    throw new TypeError('The model constructor you provided has an incorrect type. It is supposed to be a class with a static `meta` field.');
  }
  if (!model.meta) {
    throw new TypeError('The model constructor you provided doesn\'t have a static `meta` field.');
  }
  if (!model.meta.type) {
    throw new TypeError('The model constructor you provided does not have a type URL.');
  }
  if (!model.meta.mutation) {
    throw new TypeError('The model constructor you provided does not have a mutation codec.');
  }
}
