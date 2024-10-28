//
// Copyright 2024 DXOS.org
//

import { completionStatus } from '@codemirror/autocomplete';
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

import { type GridEditBox } from '../Grid';

export type EditorKeyEvent = Pick<KeyboardEvent<HTMLInputElement>, 'key'> & { shift?: boolean };

export type EditorKeysProps = {
  onClose: (value: string | undefined, event: EditorKeyEvent) => void;
  onNav?: (value: string | undefined, event: EditorKeyEvent) => void;
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
  variant?: keyof typeof editorVariants;
  box?: GridEditBox;
  gridId?: string;
} & Pick<UseTextEditorProps, 'autoFocus'> &
  Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

const editorVariants = {
  // TODO(thure): remove when legacy is no longer used.
  legacy: {
    root: 'flex w-full',
    editor: 'flex w-full [&>.cm-scroller]:scrollbar-none',
    content: '!px-2 !py-1',
  },
  grid: {
    root: 'absolute z-[1]',
    editor: '[&>.cm-scroller]:scrollbar-none tabular-nums',
    // This must match cell styling in `dx-grid.pcss`.
    content: '!border !border-transparent !pli-[3px] !plb-0.5',
  },
};

export const CellEditor = ({
  value,
  extension,
  autoFocus,
  onBlur,
  variant = 'legacy',
  box,
  gridId,
}: CellEditorProps) => {
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
              className: editorVariants[variant].editor,
            },
            content: {
              className: editorVariants[variant].content,
            },
          },
        }),
      ],
    };
  }, [extension, autoFocus, value, variant, onBlur]);

  return (
    <div
      ref={parentRef}
      className={editorVariants[variant].root}
      style={box}
      {...(gridId && { 'data-grid': gridId })}
    />
  );
};
