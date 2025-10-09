//
// Copyright 2025 DXOS.org
//

import { completionStatus } from '@codemirror/autocomplete';
import { Prec } from '@codemirror/state';
import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
  type EditorProps,
  type Extension,
  createBasicExtensions,
  createThemeExtensions,
  keymap,
} from '@dxos/react-ui-editor';

import { translationKey } from '../../translations';

import { type QueryOptions, query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    readonly?: boolean;
  } & QueryOptions &
    EditorProps
>;

/**
 * Query editor with decorations and autocomplete.
 */
// TODO(wittjosiah): Rename to FilterEditor.
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ space, tags, value, readonly, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: (view) => {
                // Prevent newline, but honor Enter if autocomplete is open.
                return !completionStatus(view.state);
              },
            },
          ]),
        ),
        query({ space, tags }),
      ],
      [space, readonly],
    );

    return <Editor {...props} moveToEnd value={value} extensions={extensions} ref={forwardedRef} />;
  },
);
