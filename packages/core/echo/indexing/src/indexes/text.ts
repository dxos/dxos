import { visitValues } from '@dxos/util';
import { isEncodedReference, type ObjectStructure } from '@dxos/echo-protocol';

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
