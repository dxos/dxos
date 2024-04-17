//
// Copyright 2024 DXOS.org
//

export type ObjectPointerDecoded = {
  documentId: string;
  objectId: string;
};

export type ObjectPointerEncoded = string;

export const idCodec = {
  encode: ({ documentId, objectId }: ObjectPointerDecoded) => `${documentId}|${objectId}`,
  decode: (id: ObjectPointerEncoded): ObjectPointerDecoded => {
    const [documentId, objectId] = id.split('|');
    return { documentId, objectId };
  },
};
