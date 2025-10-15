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
    value?: string;
    readonly?: boolean;
  } & QueryOptions &
    Omit<EditorProps, 'initialValue'>
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ db, tags, value, readonly, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode, slots: { scroll: { className: 'scrollbar-none' } } }),
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
        query({ db, tags }),
      ],
      [db, readonly],
    );

    return <Editor {...props} initialValue={value} extensions={extensions} moveToEnd ref={forwardedRef} />;
  },
);
