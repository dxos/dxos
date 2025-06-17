//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import {
  createMarkdownExtensions,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  deleteItem,
  outliner,
  useTextEditor,
  RefDropdownMenu,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { OUTLINER_PLUGIN } from '../../meta';

export type OutlinerController = {
  focus: () => void;
};

export type OutlinerProps = ThemedClassName<
  {
    id: string;
    text: DataType.Text;
    scrollable?: boolean;
    showSelected?: boolean;
  } & Pick<UseTextEditorProps, 'id' | 'autoFocus'>
>;

export const Outliner = forwardRef<OutlinerController, OutlinerProps>(
  ({ classNames, text, id, autoFocus, scrollable = true, showSelected = true }, forwardedRef) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);
    const { themeMode } = useThemeContext();
    const attentionAttrs = useAttentionAttributes(id);
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        autoFocus,
        selection: EditorSelection.cursor(text.content.length),
        initialValue: text.content,
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode, slots: { scroll: { className: scrollable ? '' : '!overflow-hidden' } } }),
          outliner({ showSelected }),
        ],
      }),
      [id, text, autoFocus, themeMode],
    );

    console.log(attentionAttrs);

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => view?.focus(),
      }),
      [view],
    );

    const handleDeleteRow = () => {
      // TODO(burdon): Timeout hack since menu steals focus.
      setTimeout(() => {
        if (view) {
          deleteItem(view);
          view.focus();
        }
      }, 100);
    };

    return (
      // TODO(burdon): Use global modal?
      <RefDropdownMenu.Provider>
        <div
          ref={parentRef}
          role='editor'
          className={mx('_flex _justify-center', classNames)}
          {...attentionAttrs}
          {...focusAttributes}
        />
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              <DropdownMenu.Item onClick={handleDeleteRow}>{t('delete row')}</DropdownMenu.Item>
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </RefDropdownMenu.Provider>
    );
  },
);
