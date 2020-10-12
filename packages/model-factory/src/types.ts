//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-experimental-runtime';
import { MutationMeta, ItemID } from '@dxos/echo-protocol';

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
}

export type ModelConstructor<T> =
  (new (meta: ModelMeta, itemId: ItemID, writeStream?: NodeJS.WritableStream) => T) & { meta: ModelMeta };

export type ModelMessage<T> = {
  meta: MutationMeta,
  mutation: T
}
