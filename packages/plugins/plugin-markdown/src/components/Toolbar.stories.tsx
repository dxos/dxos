//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  EditorToolbar,
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
  translations,
  useActionHandler,
  useComments,
  useFormattingState,
  useTextEditor,
  useEditorToolbarState,
} from '@dxos/react-ui-editor';
import { TextType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

faker.seed(101);

const DefaultStory: FC<{ content?: string }> = ({ content = '' }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(createObject(live(TextType, { content })));
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
    <div role='none' className='flex flex-col'>
      <EditorToolbar onAction={handleAction} state={toolbarState ?? {}} />
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
  decorators: [withTheme, withLayout({ tooltips: true, fullscreen: true })],
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
