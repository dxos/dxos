//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-experimental-runtime';
import { FeedMeta, ItemID } from '@dxos/echo-protocol';

//
// Types
//

export type ModelType = string;

export type ModelMeta = {
  type: ModelType,
  mutation: Codec<any> // TODO(marik-d): Specify generic type param here to match model's expected message type
}

export type ModelConstructor<T> =
  (new (meta: ModelMeta, itemId: ItemID, writeStream?: NodeJS.WritableStream) => T) & { meta: ModelMeta };

export type ModelMessage<T> = {
  meta: FeedMeta,
  mutation: T
}
