//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { forwardRef } from 'react';

import { Editor, type EditorController, type UseEditorMenuProps, type UseTextEditorProps } from '@dxos/react-ui-editor';
import type * as Util from '@dxos/react-ui/Util';
import { type BasicExtensionsOptions, type SubmitOptions } from '@dxos/ui-editor';

import { useChatExtensions } from './useChatExtensions.ts';

export interface ChatEditorController extends EditorController {}

export type ChatEditorProps = Util.ThemedClassName<
  {
    extensions?: Extension;
    /** A popover menu opened by trigger characters (e.g. `@` to mention an object). */
    menu?: Omit<UseEditorMenuProps, 'viewRef'>;
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
      menu,
      markdown = false,
      lineWrapping = false,
      placeholder,
      onSubmit,
    },
    forwardRef,
  ) => {
    const extensions = useChatExtensions({ extensions: extensionsProp, markdown, lineWrapping, placeholder, onSubmit });

    return (
      <Editor.Root ref={forwardRef} {...menu}>
        <Editor.View classNames={classNames} autoFocus={autoFocus} extensions={extensions} />
      </Editor.Root>
    );
  },
);
