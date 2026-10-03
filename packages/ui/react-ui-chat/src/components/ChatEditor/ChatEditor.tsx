//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Editor, type EditorController, type UseTextEditorProps } from '@dxos/react-ui-editor';
import { type BasicExtensionsOptions, type SubmitOptions } from '@dxos/ui-editor';

import { type ReferencesOptions } from './references.ts';
import { useChatExtensions } from './useChatExtensions.ts';

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
