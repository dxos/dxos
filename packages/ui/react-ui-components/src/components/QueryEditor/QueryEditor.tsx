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

import { translationKey } from '../../translations';

import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    space?: Space;
    readonly?: boolean;
    value?: string;
    onChange?: (text: string) => void;
  } & EditorProps
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorView | null, QueryEditorProps>(
  ({ space, value, onChange, readonly, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const editorRef = useForwardedRef(forwardedRef);

    // Extensions.
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode }),
        query({ space }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
        }),
      ],
      [space, readonly],
    );

    // Update content.
    useEffect(() => {
      const view = editorRef.current;
      if (value !== view?.state.doc.toString()) {
        requestAnimationFrame(() => {
          view?.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
          });
        });
      }
    }, [value]);

    return <Editor initialValue={value} extensions={extensions} {...props} ref={editorRef} />;
  },
);
