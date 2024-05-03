//
// Copyright 2024 DXOS.org
//

export type ObjectPointerDecoded = {
  documentId: string;
  objectId: string;
};

/**
 * Encoded object pointer: `${documentId}|${objectId}`.
 */
export type ObjectPointerEncoded = string;

export const idCodec = {
  encode: ({ documentId, objectId }: ObjectPointerDecoded): ObjectPointerEncoded => `${documentId}|${objectId}`,
  decode: (id: ObjectPointerEncoded): ObjectPointerDecoded => {
    const [documentId, objectId] = id.split('|');
    return { documentId, objectId };
  },
};
