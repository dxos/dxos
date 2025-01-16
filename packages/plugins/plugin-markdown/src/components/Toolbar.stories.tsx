//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  type EditorAction,
  type Comment,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorContent,
  formattingKeymap,
  EditorToolbar,
  translations,
  useActionHandler,
  useComments,
  useFormattingState,
  useTextEditor,
  useEditorToolbarState,
} from '@dxos/react-ui-editor';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TextType } from '../types';

faker.seed(101);

const _onUpload = async (file: File) => ({ url: file.name });

const DefaultStory: FC<{ content?: string }> = ({ content = '' }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(createObject(create(TextType, { content })));
  const toolbarState = useEditorToolbarState({ viewMode: 'preview' });
  const formattingObserver = useFormattingState(toolbarState);
  const { parentRef, view } = useTextEditor(() => {
    return {
      id: text.id,
      initialValue: text.content,
      extensions: [
        formattingObserver,
        createBasicExtensions({ readonly: toolbarState.viewMode === 'readonly' }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: { editor: { className: editorContent } } }),
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

  const handleToolbarAction = useActionHandler(view);
  const handleAction = (action: EditorAction) => {
    if (action.type === 'view-mode') {
      toolbarState.viewMode = action.properties.data;
    } else {
      handleToolbarAction?.(action);
    }
  };

  const [_comments, setComments] = useState<Comment[]>([]);
  useComments(view, text.id, _comments);

  return (
    <div role='none' className='fixed inset-0 flex flex-col'>
      <EditorToolbar onAction={handleAction} state={toolbarState ?? {}} classNames={textBlockWidth} />
      <div ref={parentRef} />
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

export const Default = {
  args: {
    content,
  },
};

const meta: Meta<typeof EditorToolbar> = {
  title: 'plugins/plugin-markdown/Toolbar',
  component: EditorToolbar,
  render: DefaultStory as any,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;
