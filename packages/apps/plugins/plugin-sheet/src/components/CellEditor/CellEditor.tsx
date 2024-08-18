//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type DOMAttributes } from 'react';

import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type TextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

import { SHEET_PLUGIN } from '../../meta';

export const editorKeys = (cb: (value: string | undefined) => void): Extension => {
  return keymap.of([
    // TODO(burdon): Navigate out if in quick edit mode (i.e., entered editor by typing, not selection).
    // {
    //   key: 'ArrowUp',
    //   key: 'ArrowDown',
    //   key: 'ArrowLeft',
    //   key: 'ArrowRight',
    // },
    {
      key: 'Enter',
      run: (editor) => {
        cb(editor.state.doc.toString());
        return true;
      },
    },
    {
      key: 'Escape',
      run: () => {
        cb(undefined);
        return true;
      },
    },
  ]);
};

export type CellEditorProps = {
  value?: string;
  extension?: Extension;
} & Pick<TextEditorProps, 'autoFocus'> &
  Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

// TODO(burdon): Imperative handle?
export const CellEditor = ({ value, extension, autoFocus, onBlur }: CellEditorProps) => {
  const { t } = useTranslation(SHEET_PLUGIN);
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      autoFocus,
      doc: value,
      extensions: [
        extension ?? [],
        preventNewline,
        EditorView.focusChangeEffect.of((_, focusing) => {
          if (!focusing) {
            onBlur?.({ type: 'blur' } as any);
          }
          return null;
        }),
        createBasicExtensions({ placeholder: t('cell placeholder'), lineWrapping: false }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: {
              className: 'flex overflow-hidden border-none [&>.cm-scroller]:scrollbar-none',
            },
            content: {
              className: 'flex !px-2 !py-1 overflow-hidden',
            },
          },
        }),
      ],
    };
  }, [extension]);

  return <div ref={parentRef} className='flex grow overflow-hidden' />;
};
