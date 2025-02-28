//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  type EditorView,
  keymap,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { createAutocompleteExtension, type AutocompleteOptions } from './prompt-autocomplete';

export type PromptProps = ThemedClassName<
  { value: string } & AutocompleteOptions &
    Pick<UseTextEditorProps, 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping'>
>;

// TODO(burdon): Handle object references.

export const Prompt = forwardRef<EditorView | undefined, PromptProps>(
  ({ classNames, value, autoFocus, lineWrapping = false, onEnter, onSuggest }, forwardRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor({
      autoFocus,
      extensions: [
        createBasicExtensions({
          lineWrapping,
          bracketMatching: false,
          placeholder: 'Ask a question...',
        }),
        createThemeExtensions({ themeMode }),
        createAutocompleteExtension({ onEnter, onSuggest }),
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-k', // Command-k
              run: (view) => {
                view.dispatch({
                  changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: '',
                  },
                  selection: {
                    anchor: 0,
                  },
                });
                return true;
              },
            },
          ]),
        ),
      ],
    });

    useImperativeHandle(forwardRef, () => view, [view]);

    useEffect(() => {
      if (value) {
        view?.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: value,
          },
          selection: {
            anchor: value.length,
            head: value.length,
          },
        });

        view?.focus();
      }
    }, [view, value]);

    return <div ref={parentRef} className={mx('w-full', classNames)} />;
  },
);
