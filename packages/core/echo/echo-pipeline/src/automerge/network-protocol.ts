//
// Copyright 2024 DXOS.org
//

import type { Message } from '@automerge/automerge-repo';

import {
  type CollectionQueryMessage,
  type CollectionStateMessage,
  type RequestProtocolMessage,
  MESSAGE_TYPE_COLLECTION_QUERY,
  MESSAGE_TYPE_COLLECTION_STATE,
} from '@dxos/protocols';

export { type CollectionStateMessage, type CollectionQueryMessage };

export const isCollectionQueryMessage = (message: Message): message is CollectionQueryMessage =>
  message.type === MESSAGE_TYPE_COLLECTION_QUERY;

export const isCollectionStateMessage = (message: Message): message is CollectionStateMessage =>
  message.type === MESSAGE_TYPE_COLLECTION_STATE;

