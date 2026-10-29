//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { Editor, type EditorController, type UseEditorMenuProps, type UseTextEditorProps } from '@dxos/react-ui-editor';
import type * as Util from '@dxos/react-ui/Util';
import { type BasicExtensionsOptions, type SubmitOptions } from '@dxos/ui-editor';

import { CommandPopover } from './CommandPopover.tsx';
import { type CommandCompletionState, closedCommandCompletion, getCommandCompletion } from './commands.ts';
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
    forwardedRef,
  ) => {
    // Mirrors the `commands()` completion list into React, which renders it in place of CodeMirror's tooltip.
    const [completion, setCompletion] = useState<CommandCompletionState>(closedCommandCompletion);
    const viewRef = useRef<EditorView | null>(null);
    const anchorRef = useRef<Element | null>(null);
    const getView = useCallback(() => viewRef.current, []);
    const completionListener = useMemo(
      () =>
        EditorView.updateListener.of((update) => {
          viewRef.current = update.view;
          anchorRef.current = update.view.dom;
          const next = getCommandCompletion(update.state);
          setCompletion((current) =>
            current.open === next.open && current.options === next.options && current.selected === next.selected
              ? current
              : next,
          );
        }),
      [],
    );
    const extensions = useChatExtensions({
      extensions: useMemo(() => [extensionsProp ?? [], completionListener], [extensionsProp, completionListener]),
      markdown,
      lineWrapping,
      placeholder,
      onSubmit,
    });

    return (
      <Editor.Root ref={forwardedRef} {...menu}>
        <Editor.View classNames={classNames} autoFocus={autoFocus} extensions={extensions} />
        <CommandPopover completion={completion} getView={getView} anchorRef={anchorRef} />
      </Editor.Root>
    );
  },
);
