//
// Copyright 2024 DXOS.org
//

import { completionStatus } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type KeyboardEvent } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { type UseTextEditorProps, useTextEditor } from '@dxos/react-ui-editor';
import {
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  filterChars,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type GridEditBox } from '../Grid';

// Kept out of `CellEditor.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

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
