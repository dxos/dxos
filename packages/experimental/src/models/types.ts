//
// Copyright 2020 DXOS.org
//

import { ItemID } from '../items';
import { IFeedMeta } from '../feeds';

//
// Types
//

export type ModelType = string;

export type ModelConstructor<T> = new (itemId: ItemID, writable?: NodeJS.WritableStream) => T;

export type ModelMessage<T> = {
  meta: IFeedMeta,
  mutation: T
}
