//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorViewProps,
  type EditorController,
  type EditorMenuProviderProps,
  createMenuGroup,
  type UseEditorMenuProps,
} from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, keymap } from '@dxos/ui-editor';

import { translationKey } from '#translations';

import { type CompletionOptions, completions } from './autocomplete';
import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    value?: string;
    readonly?: boolean;
  } & (CompletionOptions & Omit<EditorViewProps, 'initialValue'> & Pick<EditorMenuProviderProps, 'numItems'>)
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ db, tags, value, readonly, numItems = 8, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    const getOptions = useMemo(() => completions({ db, tags }), [db, tags]);
    const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
      async (context) => [createMenuGroup({ items: getOptions(context) })],
      [getOptions],
    );

    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false, placeholder: t('query-editor.placeholder') }),
        createThemeExtensions({ themeMode, slots: { scroller: { className: 'scrollbar-none' } } }),
        query({ tags }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                // Prevent newline.
                return true;
              },
            },
          ]),
        ),
      ],
      [db, readonly],
    );

    return (
      <Editor.Root
        ref={forwardedRef}
        extensions={extensions}
        numItems={numItems}
        // TODO(burdon): Handle trigger AND triggerKey.
        // trigger: ['#'],
        triggerKey='Ctrl-Space'
        getMenu={getMenu}
      >
        <Editor.View {...props} initialValue={value} selectionEnd />
      </Editor.Root>
    );
  },
);
