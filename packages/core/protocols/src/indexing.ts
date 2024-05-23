//
// Copyright 2024 DXOS.org
//

export type ObjectPointerDecoded = {
  spaceKey: string | undefined;
  documentId: string;
  objectId: string;
};

/**
 * Encoded object pointer: `#01|${spaceKey}|${documentId}|${objectId}`.
 * Old format without spaceKey: `${documentId}|${objectId}`.
 * The spaceKey is optional and was added in the later version.
 * Space key is encoded in the front to allow prefix iteration.
 */
export type ObjectPointerEncoded = string;

const V1_PREFIX = '#01';

export enum ObjectPointerVersion {
  /**
   * `${documentId}|${objectId}`
   */
  V0 = 0,
  /**
   * `#01|${spaceKey}|${documentId}|${objectId}`
   */
  V1 = 1,
}

export const objectPointerCodec = {
  encode: ({ spaceKey, documentId, objectId }: ObjectPointerDecoded): ObjectPointerEncoded => {
    if (spaceKey === undefined) {
      return `${documentId}|${objectId}`;
    } else {
      return `${V1_PREFIX}|${spaceKey}|${documentId}|${objectId}`;
    }
  },
  decode: (id: ObjectPointerEncoded): ObjectPointerDecoded => {
    if (id.startsWith(V1_PREFIX)) {
      const [_, spaceKey, documentId, objectId] = id.split('|');
      return { spaceKey, documentId, objectId };
    } else {
      const [documentId, objectId] = id.split('|');
      return { spaceKey: undefined, documentId, objectId };
    }
  },
  getVersion(id: ObjectPointerEncoded): ObjectPointerVersion {
    if (id.startsWith(V1_PREFIX)) {
      return ObjectPointerVersion.V1;
    } else {
      return ObjectPointerVersion.V0;
    }
  },
  convertV1ToV0(id: ObjectPointerEncoded): ObjectPointerEncoded {
    const { documentId, objectId } = objectPointerCodec.decode(id);
    return objectPointerCodec.encode({ documentId, objectId, spaceKey: undefined });
  },
};
