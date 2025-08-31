//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useDebugDeps, useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { type AutocompleteOptions, autocomplete } from './autocomplete';
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

    // TODO(burdon): onSubmit changed.
    useDebugDeps([themeMode, extensions, onSubmit, onSuggest, onCancel]);
    const { parentRef, view } = useTextEditor(
      () => ({
        debug: true,
        autoFocus,
        extensions: [
          createThemeExtensions({ themeMode }),
          autocomplete({ onSubmit, onSuggest, onCancel }),
          references ? referencesExtension({ provider: references.provider }) : [],
          createBasicExtensions({
            bracketMatching: false,
            lineWrapping,
            placeholder,
          }),
          extensions,
        ].filter(isNonNullable),
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
