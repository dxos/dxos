//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  keymap,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { autocomplete, type AutocompleteOptions } from './autocomplete';
import { references as referencesExtension, type ReferencesOptions } from './references';

// TODO(burdon): Handle object references.

export interface ChatEditorController {
  focus(): void;
  setText(text: string): void;
}

export type ChatEditorProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesOptions;
    onOpenChange?: (open: boolean) => void;
  } & AutocompleteOptions &
    Pick<UseTextEditorProps, 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>
>;

export const ChatEditor = forwardRef<ChatEditorController, ChatEditorProps>(
  (
    {
      classNames,
      extensions,
      references,
      autoFocus,
      lineWrapping = false,
      placeholder,
      onSubmit,
      onSuggest,
      onCancel,
      onOpenChange,
    },
    forwardRef,
  ) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor(
      {
        debug: true,
        autoFocus,
        extensions: [
          autocomplete({ onSubmit, onSuggest, onCancel }),
          references ? referencesExtension({ provider: references.provider }) : [],
          createBasicExtensions({
            bracketMatching: false,
            lineWrapping,
            placeholder,
          }),
          createThemeExtensions({ themeMode }),
          Prec.highest(
            keymap.of([
              {
                key: 'cmd-ArrowUp',
                preventDefault: true,
                run: () => {
                  onOpenChange?.(true);
                  return true;
                },
              },
              {
                key: 'cmd-ArrowDown',
                preventDefault: true,
                run: () => {
                  onOpenChange?.(false);
                  return true;
                },
              },
            ]),
          ),
          extensions,
        ].filter(isNonNullable),
      },
      [themeMode, extensions, onSubmit, onSuggest],
    );

    // Expose editor view.
    useImperativeHandle(forwardRef, () => {
      return {
        focus: () => {
          view?.focus();
        },
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

    return <div ref={parentRef} className={mx('w-full', classNames)} />;
  },
);
