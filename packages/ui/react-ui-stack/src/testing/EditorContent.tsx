//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Expando } from '@dxos/echo-schema';
import { create } from '@dxos/live-object';
import { useThemeContext, ElevationProvider } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  useActionHandler,
  EditorToolbar,
  useFormattingState,
  useTextEditor,
  useEditorToolbarState,
} from '@dxos/react-ui-editor';
import { focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { StackItem, type StackItemContentProps } from '../components';

export const EditorContent = ({ data: { content = '' } }: { data: StackItemContentProps & { content?: string } }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(create(Expando, { content }));
  const id = text.id;
  const toolbarState = useEditorToolbarState({ viewMode: 'source' });
  const formattingObserver = useFormattingState(toolbarState);
  const { parentRef, view, focusAttributes } = useTextEditor(() => {
    return {
      id,
      initialValue: text.content,
      extensions: [
        formattingObserver,
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: { editor: { className: 'p-2' } } }),
        decorateMarkdown(),
        formattingKeymap(),
      ],
    };
  }, [id, formattingObserver, themeMode]);

  const handleAction = useActionHandler(view);

  return (
    <StackItem.Content toolbar>
      <div {...focusAttributes} className={mx(textBlockWidth, focusRing, 'rounded-sm order-last')} ref={parentRef} />
      <ElevationProvider elevation='positioned'>
        <EditorToolbar
          onAction={handleAction}
          state={toolbarState ?? {}}
          classNames='sticky block-start-0 bg-[--sticky-bg] z-10'
        />
      </ElevationProvider>
    </StackItem.Content>
  );
};
