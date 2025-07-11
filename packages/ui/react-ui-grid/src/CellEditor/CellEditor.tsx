//
// Copyright 2024 DXOS.org
//

import { completionStatus } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type KeyboardEvent } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

import { type GridEditBox } from '../Grid';

export type EditorKeyEvent = Pick<KeyboardEvent<HTMLInputElement>, 'key'> & { shift?: boolean };

export type EditorKeyHandler = (value: string | undefined, event: EditorKeyEvent) => void;
export type EditorBlurHandler = (value: string | undefined) => void;
export type EditorKeyOrBlurHandler = (value: string | undefined, event?: EditorKeyEvent) => void;

export type EditorKeysProps = {
  onClose: EditorKeyHandler;
  onNav?: EditorKeyHandler;
};

// TODO(Zan): Should each consumer be responsible for defining these?
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
      key: 'Mod-ArrowLeft',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowLeft' });
        return !!onNav;
      },
    },
    {
      key: 'Mod-ArrowRight',
      run: (editor) => {
        const value = editor.state.doc.toString();
        onNav?.(value, { key: 'ArrowRight' });
        return !!onNav;
      },
    },
    {
      key: 'Enter',
      run: (editor) => {
        if (completionStatus(editor.state)) {
          return false;
        } else {
          onClose(editor.state.doc.toString(), { key: 'Enter' });
          return true;
        }
      },
      shift: (editor) => {
        if (completionStatus(editor.state)) {
          return false;
        } else {
          onClose(editor.state.doc.toString(), { key: 'Enter', shift: true });
          return true;
        }
      },
    },
    {
      key: 'Tab',
      run: (editor) => {
        if (completionStatus(editor.state)) {
          return false;
        } else {
          onClose(editor.state.doc.toString(), { key: 'Tab' });
          return true;
        }
      },
      shift: (editor) => {
        if (completionStatus(editor.state)) {
          return false;
        } else {
          onClose(editor.state.doc.toString(), { key: 'Tab', shift: true });
          return true;
        }
      },
    },
    {
      key: 'Escape',
      run: () => {
        onClose(undefined, { key: 'Escape' });
        return true;
      },
    },
  ]);
};

export type CellEditorProps = {
  value?: string;
  extension?: Extension;
  box?: GridEditBox;
  gridId?: string;
} & Pick<UseTextEditorProps, 'autoFocus'> & { onBlur?: EditorBlurHandler };

export const CellEditor = ({ value, extension, autoFocus, onBlur, box, gridId }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      autoFocus,
      initialValue: value,
      selection: { anchor: value?.length ?? 0 },
      extensions: [
        extension ?? [],
        preventNewline,
        EditorView.focusChangeEffect.of((state, focusing) => {
          if (!focusing) {
            onBlur?.(state.doc.toString());
          }
          return null;
        }),
        createBasicExtensions({ lineWrapping: true }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: {
              className:
                '!min-is-full !is-min !max-is-[--dx-grid-cell-editor-max-inline-size] !min-bs-full !max-bs-[--dx-grid-cell-editor-max-block-size]',
            },
            content: { className: '!break-normal' },
          },
        }),
      ],
    };
  }, [extension, autoFocus, value, onBlur, themeMode]);

  return (
    <div
      data-testid='grid.cell-editor'
      ref={parentRef}
      className='absolute z-[1] dx-grid__cell-editor'
      style={{
        insetInlineStart: box?.insetInlineStart ?? '0px',
        insetBlockStart: box?.insetBlockStart ?? '0px',
        minInlineSize: box?.inlineSize ?? '180px',
        minBlockSize: box?.blockSize ?? '30px',
        ...{ '--dx-gridCellWidth': `${box?.inlineSize ?? 200}px` },
      }}
      {...(gridId && { 'data-grid': gridId })}
    />
  );
};
