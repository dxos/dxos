//
// Copyright 2024 DXOS.org
//

import { convertLegacyReference } from '@dxos/echo-protocol';
import {
  decodeReference,
  encodeReference,
  isLegacyReference,
  LEGACY_TYPE_PROPERTIES,
  type ObjectStructure,
  Reference,
  type SpaceDoc,
  SpaceDocVersion,
} from '@dxos/echo-protocol';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { deepMapValuesAsync } from '@dxos/util';

export const convertLegacyReferences = async (doc: SpaceDoc): Promise<SpaceDoc> => {
  const newDoc = await deepMapValuesAsync(doc, async (value, recurse) => {
    if (isLegacyReference(value)) {
      return convertLegacyReference(value);
    }
    return recurse(value);
  });

  newDoc.version = SpaceDocVersion.CURRENT;
  return newDoc;
};

export const convertLegacySpaceRootDoc = async (root: SpaceDoc): Promise<SpaceDoc> => {
  // Convert references.
  const newDoc: SpaceDoc = await convertLegacyReferences(root);

  // Update properties type.
  const properties = findInlineObjectOfType(newDoc, LEGACY_TYPE_PROPERTIES);
  if (properties) {
    const [_, obj] = properties;
    obj.system.type = encodeReference(Reference.fromLegacyTypename(TYPE_PROPERTIES));
  }

  return newDoc;
};

/**
 * Assumes properties are at root.
 */
export const findInlineObjectOfType = (spaceDoc: SpaceDoc, typename: string): [string, ObjectStructure] | undefined => {
  for (const id in spaceDoc.objects ?? {}) {
    const obj = spaceDoc.objects![id];
    if (obj.system.type && decodeReference(obj.system.type).objectId === typename) {
      return [id, obj];
    }
  }

  return undefined;
};
