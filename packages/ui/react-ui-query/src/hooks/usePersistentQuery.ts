//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect } from 'react';

import { useManagerOptional, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type ViewState } from '@dxos/react-ui-attention/types';
import { type EditorController } from '@dxos/react-ui-editor';

/** A view-state value that carries a {@link QueryEditor}'s text beside whatever else the view persists. */
export type QueryViewState = { query: string };

export type PersistentQuerySetter = (query: string | ((query: string) => string)) => void;

/**
 * A list's filter query, held in a `ViewState` aspect (so it persists per device and per `contextId`)
 * and mirrored into the {@link QueryEditor} behind `editorRef`.
 *
 * The editor takes its text once, as `initialValue`, so a write that did not come from typing — a
 * picker over the same text, clear, another view of the same list, another tab — is pushed into it
 * here. Pushed from the subscription rather than from a render effect: the subscription fires as the
 * value is written, when the editor already holds whatever was just typed, whereas an effect can run
 * for a render that trails fast typing and rewrite the document back to older text.
 */
export const usePersistentQuery = <T extends QueryViewState, Encoded = T>(
  aspect: ViewState.Aspect<T, Encoded>,
  contextId: string | undefined,
  editorRef: RefObject<EditorController | null>,
): [string, PersistentQuerySetter] => {
  const manager = useManagerOptional();
  const { query } = useViewState(aspect, contextId);
  const { update } = useViewStateActions(aspect, contextId);
  useEffect(() => {
    if (!manager || !contextId) {
      return;
    }
    return manager.subscribe(aspect, contextId, ({ query }) => {
      const editor = editorRef.current;
      if (editor && editor.getText() !== query) {
        editor.setText(query);
      }
    });
  }, [manager, aspect, contextId, editorRef]);

  // Unchanged text keeps the same value, so the editor echoing a pushed text back is not a write.
  const setQuery = useCallback<PersistentQuerySetter>(
    (next) =>
      update((view) => {
        const query = typeof next === 'function' ? next(view.query) : next;
        return view.query === query ? view : { ...view, query };
      }),
    [update],
  );

  return [query, setQuery];
};
