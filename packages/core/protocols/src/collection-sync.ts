//
// Copyright 2024 DXOS.org
//

export type PeerId = string & { __peerId: true };

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
