//
// Copyright 2025 DXOS.org
//

import { useCallback, useRef, useEffect, useState } from 'react';

import type { TagPickerHandle } from '@dxos/react-ui-tag-picker';

type TagFilterVisibility = 'closed' | 'display' | 'controlled';

type TagFilterVisibilityEvent = 'toggle_from_toolbar' | 'tag_selected_in_message' | 'all_tags_cleared';

/**
 * Custom hook to manage focus for a TagPicker component based on visibility state.
 */
export const useTagPickerFocusRef = (tagFilterVisibility: TagFilterVisibility) => {
  const tagPickerRef = useRef<TagPickerHandle>(null);

  useEffect(() => {
    if (tagFilterVisibility === 'controlled' && tagPickerRef.current) {
      setTimeout(() => tagPickerRef.current?.focus(), 0);
    }
  }, [tagFilterVisibility]);

  return tagPickerRef;
};

/**
 * Hook to manage tag filter visibility states and transitions.
 * Returns the current filter state, visibility flag, and dispatch method to change states.
 */
export const useTagFilterVisibility = () => {
  const [tagFilterVisibility, setTagFilterVisibility] = useState<TagFilterVisibility>('closed');

  const dispatch = useCallback(
    (event: TagFilterVisibilityEvent) => {
      switch (event) {
        case 'toggle_from_toolbar':
          setTagFilterVisibility((value) => (value !== 'closed' ? 'closed' : 'controlled'));
          return;

        case 'tag_selected_in_message':
          // Always set to 'display' when a tag is selected regardless of current state
          // This fixes the issue where filter doesn't appear after being toggled off
          setTagFilterVisibility('display');
          return;

        case 'all_tags_cleared':
          if (tagFilterVisibility === 'display') {
            setTagFilterVisibility('closed');
          }
      }
    },
    [tagFilterVisibility],
  );

  return {
    tagFilterState: tagFilterVisibility,
    tagFilterVisible: tagFilterVisibility !== 'closed',
    dispatch,
  };
};
