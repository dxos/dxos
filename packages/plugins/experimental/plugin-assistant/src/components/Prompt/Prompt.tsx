//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  keymap,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { createAutocompleteExtension, type AutocompleteOptions } from './autocomplete';

// TODO(burdon): Handle object references.

export interface PromptController {
  focus(): void;
  setText(text: string): void;
}

export type PromptProps = ThemedClassName<
  {
    onOpenChange?: (open: boolean) => void;
  } & AutocompleteOptions &
    Pick<UseTextEditorProps, 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>
>;

export const Prompt = forwardRef<PromptController, PromptProps>(
  ({ classNames, autoFocus, lineWrapping = false, placeholder, onSubmit, onSuggest, onOpenChange }, forwardRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor(
      {
        autoFocus,
        extensions: [
          createBasicExtensions({
            bracketMatching: false,
            lineWrapping,
            placeholder,
          }),
          createThemeExtensions({ themeMode }),
          createAutocompleteExtension({ onSubmit, onSuggest }),
          keymap.of([
            {
              key: 'Alt-ArrowUp',
              preventDefault: true,
              run: (view) => {
                onOpenChange?.(true);
                return true;
              },
            },
            {
              key: 'Alt-ArrowDown',
              preventDefault: true,
              run: (view) => {
                onOpenChange?.(false);
                return true;
              },
            },
          ]),
        ],
      },
      [themeMode, onSubmit, onSuggest],
    );

    // Expose editor view.
    useImperativeHandle(
      forwardRef,
      () => {
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
      },
      [view, onSubmit],
    );

    return <div ref={parentRef} className={mx('w-full overflow-hidden', classNames)} />;
  },
);
