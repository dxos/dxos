//
// Copyright 2025 DXOS.org
//

import { useSearchListInputContext } from '../context';

/**
 * Hook to access the search context for custom input implementations.
 */
export const useSearchListInput = () => {
  const { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
    useSearchListInputContext('useSearchListInput');
  return { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect };
};
