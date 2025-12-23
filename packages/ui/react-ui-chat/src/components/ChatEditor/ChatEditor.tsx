//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { Editor, type EditorController, type UseTextEditorProps } from '@dxos/react-ui-editor';
import {
  type BasicExtensionsOptions,
  type SubmitOptions,
  createBasicExtensions,
  createThemeExtensions,
  submit,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { type ReferencesOptions } from './references';

export interface ChatEditorController extends EditorController {}

export type ChatEditorProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesOptions;
  } & (SubmitOptions &
    Pick<UseTextEditorProps, 'id' | 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>)
>;

export const useChatExtensions = ({ extensions, lineWrapping = false, placeholder, onSubmit }: ChatEditorProps) => {
  const { themeMode } = useThemeContext();
  return useMemo<Extension[]>(
    () =>
      [
        createThemeExtensions({ themeMode }),
        createBasicExtensions({ bracketMatching: false, lineWrapping, placeholder }),
        submit({ onSubmit }),
        extensions,
      ].filter(isTruthy),
    [themeMode, extensions, onSubmit],
  );
};

export const ChatEditor = forwardRef<ChatEditorController, ChatEditorProps>(
  ({ classNames, autoFocus, extensions: extensionsParam, lineWrapping = false, placeholder, onSubmit }, forwardRef) => {
    const extensions = useChatExtensions({ extensions: extensionsParam, lineWrapping, placeholder, onSubmit });

    // TODO(burdon): Popover.
    return (
      <Editor.Root ref={forwardRef}>
        <Editor.Content classNames={classNames} autoFocus={autoFocus} extensions={extensions} />
      </Editor.Root>
    );
  },
);
