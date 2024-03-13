//
// Copyright 2024 DXOS.org
//

export type IdDecoded = {
  documentId: string;
  objectId: string;
};

export const idCodec = {
  encode: ({ documentId, objectId }: IdDecoded) => `${documentId}|${objectId}`,
  decode: (id: string): IdDecoded => {
    const [documentId, objectId] = id.split('|');
    return { documentId, objectId };
  },
};
