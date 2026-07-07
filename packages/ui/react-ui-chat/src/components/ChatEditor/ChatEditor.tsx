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
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  submit,
  xmlFormatting,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { type ReferencesOptions } from './references';

export interface ChatEditorController extends EditorController {}

export type ChatEditorProps = ThemedClassName<
  {
    extensions?: Extension;
    references?: ReferencesOptions;
    /** Enable inline markdown formatting (decoration, syntax highlighting, and formatting shortcuts). */
    markdown?: boolean;
  } & (SubmitOptions &
    Pick<UseTextEditorProps, 'id' | 'autoFocus'> &
    Pick<BasicExtensionsOptions, 'lineWrapping' | 'placeholder'>)
>;

export const useChatExtensions = ({
  extensions,
  markdown = false,
  lineWrapping = false,
  placeholder,
  onSubmit,
}: ChatEditorProps) => {
  const { themeMode } = useThemeContext();
  return useMemo<Extension[]>(
    () =>
      [
        createThemeExtensions({ themeMode, syntaxHighlighting: markdown }),
        createBasicExtensions({ bracketMatching: false, lineWrapping, placeholder }),
        xmlFormatting(),
        markdown && [createMarkdownExtensions(), decorateMarkdown(), formattingKeymap()],
        submit({ onSubmit }),
        extensions,
      ]
        .flat()
        .filter(isTruthy),
    [themeMode, markdown, lineWrapping, placeholder, extensions, onSubmit],
  );
};

export const ChatEditor = forwardRef<ChatEditorController, ChatEditorProps>(
  (
    {
      classNames,
      autoFocus,
      extensions: extensionsProp,
      markdown = false,
      lineWrapping = false,
      placeholder,
      onSubmit,
    },
    forwardRef,
  ) => {
    const extensions = useChatExtensions({ extensions: extensionsProp, markdown, lineWrapping, placeholder, onSubmit });

    // TODO(burdon): Popover.
    return (
      <Editor.Root ref={forwardRef}>
        <Editor.View classNames={classNames} autoFocus={autoFocus} extensions={extensions} />
      </Editor.Root>
    );
  },
);
