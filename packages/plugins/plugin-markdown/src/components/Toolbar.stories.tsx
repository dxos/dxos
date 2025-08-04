//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { type FC, useCallback, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { createDocAccessor } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  type Comment,
  EditorToolbar,
  type EditorViewMode,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorSlots,
  formattingKeymap,
  translations,
  useComments,
  useEditorToolbarState,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

faker.seed(101);

const DefaultStory: FC<{ content?: string }> = ({ content = '' }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(DataType.makeText(content));
  const toolbarState = useEditorToolbarState({ viewMode: 'preview' });
  const formattingObserver = useFormattingState(toolbarState);
  const { parentRef, view } = useTextEditor(() => {
    return {
      id: text.id,
      initialValue: text.content,
      extensions: [
        formattingObserver,
        createBasicExtensions({ readOnly: toolbarState.viewMode === 'readonly' }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: editorSlots }),
        createDataExtensions({ id: text.id, text: createDocAccessor(text, ['content']) }),
        comments({
          onCreate: ({ cursor }) => {
            const id = PublicKey.random().toHex();
            setComments((comments) => [...comments, { id, cursor }]);
            return id;
          },
        }),
        formattingKeymap(),
        ...(toolbarState.viewMode !== 'source' ? [decorateMarkdown()] : []),
      ],
    };
  }, [text, formattingObserver, toolbarState.viewMode, themeMode]);

  const handleViewModeChange = (viewMode: EditorViewMode) => {
    toolbarState.viewMode = viewMode;
  };

  const getView = useCallback(() => {
    invariant(view);
    return view;
  }, [view]);

  const [_comments, setComments] = useState<Comment[]>([]);
  useComments(view, text.id, _comments);

  return (
    <div role='none' className='flex flex-col'>
      <EditorToolbar state={toolbarState ?? {}} getView={getView} viewMode={handleViewModeChange} />
      <div className='flex grow overflow-hidden' ref={parentRef} />
    </div>
  );
};

const content = [
  '# Demo',
  '',
  'The editor supports **Markdown** styles.',
  '',
  faker.lorem.paragraph({ min: 5, max: 8 }),
  '',
  '',
].join('\n');

const meta: Meta<typeof EditorToolbar> = {
  title: 'plugins/plugin-markdown/Toolbar',
  component: EditorToolbar,
  render: DefaultStory as any,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations,
  },
};

export default meta;

export const Default = {
  args: {
    content,
  },
};
