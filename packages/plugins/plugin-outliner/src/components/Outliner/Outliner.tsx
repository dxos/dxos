//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle } from 'react';

import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createMarkdownExtensions,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
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
  } & Pick<UseTextEditorProps, 'id' | 'autoFocus'>
>;

export const Outliner = forwardRef<OutlinerController, OutlinerProps>(
  ({ classNames, text, id, autoFocus, scrollable = true }, forwardedRef) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);
    const { themeMode } = useThemeContext();
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        autoFocus,
        // TODO(burdon): Make this optional.
        initialValue: text.content,
        // Auto select end of document.
        selection: EditorSelection.cursor(text.content.length),
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode, slots: { scroll: { className: scrollable ? '' : '!overflow-hidden' } } }),
          outliner(),
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

    const handleDeleteRow = () => {
      log.info('delete row');
    };

    return (
      <RefDropdownMenu.Provider>
        <div ref={parentRef} {...focusAttributes} className={mx('flex w-full justify-center', classNames)} />
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
