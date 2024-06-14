import { createIdFromSpaceKey } from '@dxos/echo-pipeline';
import {
  Reference,
  SpaceDocVersion,
  decodeReference,
  encodeReference,
  isLegacyReference,
  type EncodedReferenceObject,
  type LegacyEncodedReferenceObject,
  type ObjectStructure,
  type SpaceDoc,
} from '@dxos/echo-protocol';
import { LEGACY_TYPE_PROPERTIES } from '@dxos/echo-protocol/src';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { deepMapValuesAsync } from '@dxos/util';

const convertLegacyReference = async (reference: LegacyEncodedReferenceObject): Promise<EncodedReferenceObject> => {
  const spaceKey = reference.host;
  const spaceId = spaceKey !== undefined ? await createIdFromSpaceKey(PublicKey.fromHex(spaceKey)) : undefined;

  if (!reference.itemId) {
    throw new Error('Invalid reference');
  }

  return encodeReference(new Reference(reference.itemId, reference.protocol ?? undefined, spaceId));
};

export const convertLegacySpaceDoc = async (root: SpaceDoc): Promise<SpaceDoc> => {
  // Convert references.
  const newDoc: SpaceDoc = await deepMapValuesAsync(root, async (value, recurse) => {
    if (isLegacyReference(value)) {
      return convertLegacyReference(value);
    }
    return recurse(value);
  });

  // Update properties type.
  const properties = findInlineObjectOfType(newDoc, LEGACY_TYPE_PROPERTIES);
  if (!properties) {
    throw new Error('Properties object not found');
  }
  properties[1].system.type = encodeReference(new Reference(TYPE_PROPERTIES));

  newDoc.version = SpaceDocVersion.CURRENT;

  return newDoc;
};

/**
 * Assumes properties are at root.
 */
export const findInlineObjectOfType = (spaceDoc: SpaceDoc, typename: string): [string, ObjectStructure] | undefined => {
  for (const id in spaceDoc.objects ?? {}) {
    const obj = spaceDoc.objects![id];
    if (obj.system.type && decodeReference(obj.system.type).itemId === typename) {
      return [id, obj];
    }
  }
  return undefined;
};
