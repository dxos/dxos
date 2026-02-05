//
// Copyright 2025 DXOS.org
//

import { useSearchListItemContext } from '../context';

/**
 * Hook to access selection state for custom item renderers.
 * Returns the current selected value and registration functions.
 */
export const useSearchListItem = () => {
  const { selectedValue, registerItem, unregisterItem } = useSearchListItemContext('useSearchListItem');
  return { selectedValue, registerItem, unregisterItem };
};
