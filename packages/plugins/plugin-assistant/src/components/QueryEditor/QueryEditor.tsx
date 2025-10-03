//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useEffect, useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { type ThemedClassName, useForwardedRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorProps,
  EditorView,
  type Extension,
  createBasicExtensions,
  createThemeExtensions,
} from '@dxos/react-ui-editor';

import { meta } from '../../meta';

import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    space?: Space;
    query?: string;
    onQueryUpdate?: (query: string) => void;
  } & EditorProps
>;

export const QueryEditor = forwardRef<EditorView | undefined, QueryEditorProps>(
  ({ space, query: initialValue, onQueryUpdate, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const ref = useForwardedRef(forwardedRef);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode }),
        EditorView.updateListener.of((view) => {
          onQueryUpdate?.(view.state.sliceDoc());
        }),
        query({ space }),
      ],
      [space],
    );

    // Update content.
    useEffect(() => {
      const view = ref.current;
      if (initialValue !== view?.state.sliceDoc()) {
        requestAnimationFrame(() => {
          view?.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: initialValue },
          });
        });
      }
    }, [initialValue]);

    return <Editor initialValue={initialValue} extensions={extensions} {...props} ref={ref} />;
  },
);
