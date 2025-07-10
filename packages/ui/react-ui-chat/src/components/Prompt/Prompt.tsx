//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createThemeExtensions,
  keymap,
  useTextEditor,
  type BasicExtensionsOptions,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { autocompleteExtension, type AutocompleteOptions } from './autocomplete';
import { promptReferences, type ReferencesProvider } from './references';

// TODO(burdon): Handle object references.

export interface PromptController {
  focus(): void;
  setText(text: string): void;
}

export type PromptProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesProvider;
    onOpenChange?: (open: boolean) => void;
  } & AutocompleteOptions &
    Pick<UseTextEditorProps, 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>
>;

export const Prompt = forwardRef<PromptController, PromptProps>(
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
          autocompleteExtension({ onSubmit, onSuggest, onCancel }),
          createBasicExtensions({
            bracketMatching: false,
            lineWrapping,
            placeholder,
          }),
          createThemeExtensions({ themeMode }),
          references ? promptReferences({ provider: references }) : [],
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

    return <div ref={parentRef} className={mx('w-full', classNames)} />;
  },
);
