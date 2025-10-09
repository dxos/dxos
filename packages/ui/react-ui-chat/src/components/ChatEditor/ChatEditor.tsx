//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useFocusFinders } from '@fluentui/react-tabster';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type AutocompleteOptions,
  type BasicExtensionsOptions,
  type UseTextEditorProps,
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isTruthy } from '@dxos/util';

import { type ReferencesOptions, references as referencesExtension } from './references';

export interface ChatEditorController {
  focus(): void;
  getText(): string;
  setText(text: string): void;
}

export type ChatEditorProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesOptions;
  } & AutocompleteOptions &
    Pick<UseTextEditorProps, 'id' | 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>
>;

export const ChatEditor = forwardRef<ChatEditorController, ChatEditorProps>(
  (
    { classNames, extensions, references, autoFocus, lineWrapping = false, placeholder, onSubmit, onSuggest, onCancel },
    forwardRef,
  ) => {
    const { themeMode } = useThemeContext();
    const { findNextFocusable, findPrevFocusable } = useFocusFinders();
    const { parentRef, view } = useTextEditor(
      () => ({
        debug: true,
        autoFocus,
        extensions: [
          createThemeExtensions({ themeMode }),
          createBasicExtensions({ bracketMatching: false, lineWrapping, placeholder }),
          createBasicExtensions({
            bracketMatching: false,
            lineWrapping,
            placeholder,
          }),
          autocomplete({ onSubmit, onSuggest, onCancel }),
          references ? referencesExtension({ provider: references.provider }) : [],
          // TODO(burdon): Standardize.
          keymap.of([
            {
              key: 'Tab',
              preventDefault: true,
              run: (view) => {
                findNextFocusable(view.dom)?.focus();
                return true;
              },
            },
            {
              key: 'Shift-Tab',
              preventDefault: true,
              run: (view) => {
                findPrevFocusable(view.dom)?.focus();
                return true;
              },
            },
          ]),
          extensions,
        ].filter(isTruthy),
      }),
      [themeMode, extensions, onSubmit, onSuggest, onCancel],
    );

    // Expose editor view.
    useImperativeHandle(forwardRef, () => {
      return {
        focus: () => {
          view?.focus();
        },
        getText: () => view?.state.doc.toString() ?? '',
        setText: (text: string) => {
          view?.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: text,
            },
            selection: {
              anchor: text.length,
              head: text.length,
            },
          });
        },
      };
    }, [view, onSubmit]);

    return <div ref={parentRef} className={mx('is-full', classNames)} />;
  },
);
