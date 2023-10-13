//
// Copyright 2023 DXOS.org
//

import { useContainer } from './useContainer';
import { MosaicDataItem } from '../types';

/**
 * Returns a sorted collection of items if a compare function is provided.
 */
export const useSortedItems = <T extends MosaicDataItem>(items: T[]): T[] => {
  const { compare } = useContainer();
  return compare ? [...items].sort(compare) : items;
};
