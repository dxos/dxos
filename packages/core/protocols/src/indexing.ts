//
// Copyright 2024 DXOS.org
//

export const idCodec = {
  encode: ({ documentId, objectId }: { documentId: string; objectId: string }) => `${documentId}|${objectId}`,
  decode: (id: string) => {
    const [documentId, objectId] = id.split('|');
    return { documentId, objectId };
  },
};
