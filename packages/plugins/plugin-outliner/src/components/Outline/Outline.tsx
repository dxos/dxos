//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseTextEditorProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  deleteItem,
  hashtag,
  outliner,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type Text } from '@dxos/schema';

import { meta } from '../../meta';

export type OutlineController = {
  focus: () => void;
};

export type OutlineProps = ThemedClassName<
  {
    id: string;
    text: Text.Text;
    scrollable?: boolean;
    showSelected?: boolean;
  } & Pick<UseTextEditorProps, 'id' | 'autoFocus'>
>;

export const Outline = forwardRef<OutlineController, OutlineProps>(
  ({ classNames, text, id, autoFocus, scrollable = true, showSelected = true }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        autoFocus,
        selection: EditorSelection.cursor(text.content.length),
        initialValue: text.content,
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
          createBasicExtensions({ readOnly: false, search: true }),
          createMarkdownExtensions(),
          createThemeExtensions({ themeMode, slots: { scroll: { className: scrollable ? '' : '!overflow-hidden' } } }),
          outliner({ showSelected }),
          hashtag(),
        ],
      }),
      [id, text, autoFocus, themeMode],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => view?.focus(),
      }),
      [view],
    );

    const commandGroups: EditorMenuGroup[] = useMemo(
      () => [
        {
          id: 'outliner-actions',
          items: [
            {
              id: 'delete-row',
              label: t('delete row'),
              onSelect: ({ view }) => {
                // TODO(burdon): Timeout hack since menu steals focus.
                setTimeout(() => {
                  deleteItem(view);
                  view.focus();
                }, 100);
              },
            },
          ],
        },
      ],
      [t],
    );

    const handleSelect = useCallback<NonNullable<EditorMenuProviderProps['onSelect']>>(({ view, item }) => {
      if (view && item.onSelect) {
        return item.onSelect({ view, head: view.state.selection.main.head });
      }
    }, []);

    return (
      <EditorMenuProvider view={view} groups={commandGroups} onSelect={handleSelect}>
        <div ref={parentRef} className={mx(classNames)} {...focusAttributes} />
      </EditorMenuProvider>
    );
  },
);
