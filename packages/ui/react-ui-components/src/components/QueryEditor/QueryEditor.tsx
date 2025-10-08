//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
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
  } & EditorProps
>;

/**
 * Query editor with decorations and autocomplete.
 */
// TODO(wittjosiah): Rename to FilterEditor.
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ space, value, readonly, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              return true;
            }

            return false;
          },
        }),
        createBasicExtensions({ readOnly: readonly, lineWrapping: false, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode }),
        query({ space }),
      ],
      [space, readonly],
    );

    return <Editor {...props} moveToEnd value={value} extensions={extensions} ref={forwardedRef} />;
  },
);
