//
// Copyright 2024 DXOS.org
//

export type FeedBlock = {
  index: number;
  data: Uint8Array;
  nodes: {
    index: number;
    hash: Uint8Array;
    size: number;
  }[];
  signature: Uint8Array;
};

export type GetMetadataProtocolMessage = {
  type: 'get-metadata';
  feedKey: string;
};

export type MetadataProtocolMessage = {
  type: 'metadata';
  feedKey: string;
  length: number;
};

export type RequestProtocolMessage = {
  type: 'request';
  feedKey: string;
  range: { from: number; to: number };
};

export type DataProtocolMessage = {
  type: 'data';
  feedKey: string;
  blocks: FeedBlock[];
};

export type ProtocolMessage =
  | GetMetadataProtocolMessage
  | MetadataProtocolMessage
  | RequestProtocolMessage
  | DataProtocolMessage;
