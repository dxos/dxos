//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type DOMAttributes } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

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
} & Pick<UseTextEditorProps, 'autoFocus'> &
  Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

export const CellEditor = ({ value, extension, autoFocus, onBlur }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      autoFocus,
      initialValue: value,
      selection: { anchor: value?.length ?? 0 },
      extensions: [
        extension ?? [],
        preventNewline,
        EditorView.focusChangeEffect.of((_, focusing) => {
          if (!focusing) {
            onBlur?.({ type: 'blur' } as any);
          }
          return null;
        }),
        createBasicExtensions({ lineWrapping: false }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: {
              className: 'flex w-full [&>.cm-scroller]:scrollbar-none',
            },
            content: {
              className: '!px-2 !py-1',
            },
          },
        }),
      ],
    };
  }, [extension]);

  return <div ref={parentRef} className='flex w-full' />;
};
