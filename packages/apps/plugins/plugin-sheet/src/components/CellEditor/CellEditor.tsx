//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type DOMAttributes, type KeyboardEvent } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

export type EditorKeysProps = {
  onClose: (value: string | undefined) => void;
  onNav?: (value: string | undefined, ev: Pick<KeyboardEvent<HTMLInputElement>, 'key'>) => void;
};

export const editorKeys = ({ onNav, onClose }: EditorKeysProps): Extension => {
  return keymap.of([
    {
      key: 'ArrowUp',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowUp' });
        return !!onNav;
      },
    },
    {
      key: 'ArrowDown',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowDown' });
        return !!onNav;
      },
    },
    {
      key: 'ArrowLeft',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowLeft' });
        return !!onNav;
      },
    },
    {
      key: 'ArrowRight',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowRight' });
        return !!onNav;
      },
    },
    {
      key: 'Enter',
      run: (editor) => {
        onClose(editor.state.doc.toString());
        return true;
      },
    },
    {
      key: 'Escape',
      run: () => {
        onClose(undefined);
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
