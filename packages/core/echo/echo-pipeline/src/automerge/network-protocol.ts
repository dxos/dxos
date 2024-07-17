//
// Copyright 2024 DXOS.org
//

import type { Message, PeerId } from '@dxos/automerge/automerge-repo';

export const MESSAGE_TYPE_COLLECTION_QUERY = 'collection-query';

export type CollectionQueryMessage = {
  type: typeof MESSAGE_TYPE_COLLECTION_QUERY;
  senderId: PeerId;
  targetId: PeerId;
  collectionId: string;

  /**
   * Identifier of the current state.
   * Remote peer will skip sending the state if it has the same tag.
   */
  stateTag?: string;
};

export const isCollectionQueryMessage = (message: Message): message is CollectionQueryMessage =>
  message.type === MESSAGE_TYPE_COLLECTION_QUERY;

export const MESSAGE_TYPE_COLLECTION_STATE = 'collection-state';

export type CollectionStateMessage = {
  type: typeof MESSAGE_TYPE_COLLECTION_STATE;
  senderId: PeerId;
  targetId: PeerId;
  collectionId: string;

  /**
   *  State representation is implementation-defined.
   */
  state?: unknown;

  /**
   * Identifier of the current state.
   */
  stateTag?: string;
};

export const isCollectionStateMessage = (message: Message): message is CollectionStateMessage =>
  message.type === MESSAGE_TYPE_COLLECTION_STATE;
