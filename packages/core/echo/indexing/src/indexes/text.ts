//
// Copyright 2025 DXOS.org
//

import { EncodedReference, ObjectStructure, isEncodedReference } from '@dxos/echo-protocol';
import { visitValues } from '@dxos/util';

/**
 * Types that are excluded from text indexing.
 */
const IGNORED_TYPENAMES: string[] = ['dxos.org/type/Canvas'];

export type ExtractInputBlock = {
  content: string;

  /**
   * The weight of the block.
   */
  // TODO(dmaretskyi): Currently not supported.
  weight?: number;
};

/**
 * Extracts all text field values from an object.
 */
export const extractTextBlocks = (object: Partial<ObjectStructure>): ExtractInputBlock[] => {
  const type = ObjectStructure.getTypeReference(object as any);
  const dxnType = type && EncodedReference.toDXN(type);

  if (IGNORED_TYPENAMES.includes(dxnType?.asTypeDXN()?.type ?? '')) {
    return [];
  }

  const blocks: ExtractInputBlock[] = [];

  const go = (value: any, _key: string | number) => {
    if (isEncodedReference(value)) {
      return;
    }
    if (typeof value === 'string') {
      blocks.push({ content: value });
    }
    visitValues(value, go);
  };
  visitValues(object.data, go);

  return blocks;
};
