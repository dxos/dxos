//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { type ThemedClassName, setRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  EditorContent,
  type EditorContentProps,
  type EditorController,
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type Extension,
  type UseEditorMenuProps,
  createBasicExtensions,
  createMenuGroup,
  createThemeExtensions,
  keymap,
  useEditorMenu,
} from '@dxos/react-ui-editor';

import { translationKey } from '../../translations';

import { type CompletionOptions, completions } from './autocomplete';
import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    value?: string;
    readonly?: boolean;
  } & (CompletionOptions & Omit<EditorContentProps, 'initialValue'> & Pick<EditorMenuProviderProps, 'numItems'>)
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ db, tags, value, readonly, numItems = 8, ...props }, forwardedRef) => {
    const [controller, setController] = useState<EditorController | null>(null);
    // TODO(burdon): This is suspicious.
    useEffect(() => {
      setRef(forwardedRef, controller);
    }, [controller]);

    const getOptions = useMemo(() => completions({ db, tags }), [db, tags]);
    const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
      async (context) => [createMenuGroup({ items: getOptions(context) })],
      [getOptions],
    );

    const { groupsRef, extension, ...menuProps } = useEditorMenu({
      // TODO(burdon): Handle trigger AND triggerKey.
      // trigger: ['#'],
      triggerKey: 'Ctrl-Space',
      getMenu,
    });

    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false, placeholder: t('query placeholder') }),
        createThemeExtensions({ themeMode, slots: { scroll: { className: 'scrollbar-none' } } }),
        query({ tags }),
        extension,
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
      [db, extension, readonly],
    );

    return (
      <EditorMenuProvider view={controller?.view} groups={groupsRef.current} numItems={numItems} {...menuProps}>
        <EditorContent {...props} initialValue={value} extensions={extensions} moveToEnd ref={setController} />
      </EditorMenuProvider>
    );
  },
);
