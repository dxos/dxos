//
// Copyright 2025 DXOS.org
//

import { useComputed, useSignal } from '@preact/signals-react';
import { useCallback, useEffect, useRef } from 'react';

import type { SearchBoxController } from '@dxos/react-ui-components';

type TagFilterVisibility = 'closed' | 'display' | 'controlled';

type TagFilterVisibilityEvent = 'toggle_from_toolbar' | 'tag_selected_from_message' | 'all_tags_cleared';

/**
 * Custom hook to manage focus for a QueryEditor component based on visibility state.
 */
export const useQueryEditorFocusRef = (tagFilterVisibility: TagFilterVisibility) => {
  const queryEditorRef = useRef<SearchBoxController>(null);
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (tagFilterVisibility === 'controlled' && queryEditorRef.current) {
      t = setTimeout(() => queryEditorRef.current?.focus());
    }
    return () => clearTimeout(t);
  }, [tagFilterVisibility]);

  return queryEditorRef;
};

/**
 * Hook to manage tag filter visibility states and transitions.
 * Returns the current filter state, visibility flag, and dispatch method to change states.
 */
export const useTagFilterVisibility = () => {
  const tagFilterVisibility = useSignal('closed' as TagFilterVisibility);
  const tagFilterVisible = useComputed(() => tagFilterVisibility.value !== 'closed');

  const dispatch = useCallback(
    (event: TagFilterVisibilityEvent) => {
      switch (event) {
        case 'toggle_from_toolbar':
          tagFilterVisibility.value = tagFilterVisibility.value !== 'closed' ? 'closed' : 'controlled';
          return;

        case 'tag_selected_from_message':
          // Always set to 'display' when a tag is selected regardless of current state.
          // This fixes the issue where filter doesn't appear after being toggled off.
          tagFilterVisibility.value = 'display';
          return;

        case 'all_tags_cleared':
          if (tagFilterVisibility.value === 'display') {
            tagFilterVisibility.value = 'closed';
          }
      }
    },
    [tagFilterVisibility],
  );

  return {
    tagFilterState: tagFilterVisibility.value,
    tagFilterVisible,
    dispatch,
  };
};
