//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type AutocompleteOptions,
  type BasicExtensionsOptions,
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isTruthy } from '@dxos/util';

import { type ReferencesOptions } from './references';

export interface ChatEditorController {
  focus(): void;
  getText(): string;
  setText(text: string): void;
}

// TODO(burdon): Replace AutocompleteOptions.
export type ChatEditorProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesOptions;
  } & (AutocompleteOptions &
    Pick<UseTextEditorProps, 'id' | 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>)
>;

/**
 * @deprecated Reconcile with plugin-assistant.
 */
// TODO(burdon): Remove and use Editor.Root with Popover and Autocomplete in plugin-assistant.
export const ChatEditor = forwardRef<ChatEditorController, ChatEditorProps>(
  (
    { classNames, extensions, autoFocus, lineWrapping = false, placeholder, onSubmit, onSuggest, onCancel },
    forwardRef,
  ) => {
    const { themeMode } = useThemeContext();
    // const { findNextFocusable, findPrevFocusable } = useFocusFinders();
    const { parentRef, view } = useTextEditor(
      () => ({
        debug: true,
        autoFocus,
        extensions: [
          createThemeExtensions({ themeMode }),
          createBasicExtensions({ bracketMatching: false, lineWrapping, placeholder }),

          // autocomplete({ onSubmit, onSuggest, onCancel }),
          // references ? referencesExtension({ provider: references.provider }) : [],
          // TODO(burdon): Standardize.
          Prec.highest(
            keymap.of([
              {
                key: 'Enter',
                preventDefault: true,
                run: (view) => {
                  const text = view.state.doc.toString().trim();
                  if (onSubmit && text.length > 0) {
                    const reset = onSubmit(text);
                    if (reset) {
                      // Clear the document after calling onEnter.
                      view.dispatch({
                        changes: {
                          from: 0,
                          to: view.state.doc.length,
                          insert: '',
                        },
                      });
                    }
                  }

                  return true;
                },
              },
              {
                key: 'Tab',
                preventDefault: true,
                run: (_view) => {
                  // findNextFocusable(view.dom)?.focus();
                  return true;
                },
                shift: (_view) => {
                  // findPrevFocusable(view.dom)?.focus();
                  return true;
                },
              },
            ]),
          ),
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
