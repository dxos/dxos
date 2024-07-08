import type { Message, PeerId } from '@dxos/automerge/automerge-repo';

export const MESSAGE_TYPE_COLLECTION_QUERY = 'collection-query';

export type CollectionQueryMessage = {
  type: typeof MESSAGE_TYPE_COLLECTION_QUERY;
  senderId: PeerId;
  targetId: PeerId;
  collectionId: string;
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
  state: unknown;
};

export const isCollectionStateMessage = (message: Message): message is CollectionStateMessage =>
  message.type === MESSAGE_TYPE_COLLECTION_STATE;
