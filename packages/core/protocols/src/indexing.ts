//
// Copyright 2024 DXOS.org
//

export type IdDecoded = {
  spaceKey: string;
  documentId: string;
  objectId: string;
};

export const idCodec = {
  encode: ({ spaceKey, documentId, objectId }: IdDecoded) => `${spaceKey}|${documentId}|${objectId}`,
  decode: (id: string): IdDecoded => {
    const [spaceKey, documentId, objectId] = id.split('|');
    return { spaceKey, documentId, objectId };
  },
};
