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
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ space, value, readonly, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode }),
        query({ space }),
      ],
      [space, readonly],
    );

    return <Editor value={value} extensions={extensions} {...props} ref={forwardedRef} />;
  },
);
