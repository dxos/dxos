//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { type ThemedClassName, updateRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
  type EditorProps,
  type Extension,
  PopoverMenuProvider,
  type UsePopoverMenuProps,
  createBasicExtensions,
  createMenuGroup,
  createThemeExtensions,
  keymap,
  usePopoverMenu,
} from '@dxos/react-ui-editor';

import { translationKey } from '../../translations';

import { type CompletionOptions, completions } from './autocomplete';
import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    value?: string;
    readonly?: boolean;
  } & (CompletionOptions & Omit<EditorProps, 'initialValue'>)
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ db, tags, value, readonly, ...props }, forwardedRef) => {
    const [controller, setController] = useState<EditorController | null>(null);
    useEffect(() => {
      updateRef(forwardedRef, controller);
    }, [controller]);

    const getOptions = useMemo(() => completions({ db, tags }), [db, tags]);
    const getMenu = useCallback<NonNullable<UsePopoverMenuProps['getMenu']>>(
      async (context) => [createMenuGroup({ items: getOptions(context) })],
      [getOptions],
    );

    const { groupsRef, extension, ...menuProps } = usePopoverMenu({
      // TODO(burdon): Handle trigger AND triggerKey.
      // trigger: ['#'],
      triggerKey: 'Ctrl-Space',
      filter: false,
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
      <PopoverMenuProvider view={controller?.view} groups={groupsRef.current} {...menuProps}>
        <Editor {...props} initialValue={value} extensions={extensions} moveToEnd ref={setController} />
      </PopoverMenuProvider>
    );
  },
);
