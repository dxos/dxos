//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  type Action,
  type Comment,
  type EditorViewMode,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorContent,
  formattingKeymap,
  Toolbar,
  translations,
  useActionHandler,
  useComments,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TextType } from '../types';

faker.seed(101);

const DefaultStory: FC<{ content?: string }> = ({ content = '' }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(createObject(create(TextType, { content })));
  const [formattingState, formattingObserver] = useFormattingState();
  const [viewMode, setViewMode] = useState<EditorViewMode>('preview');
  const { parentRef, view } = useTextEditor(() => {
    return {
      id: text.id,
      initialValue: text.content,
      extensions: [
        formattingObserver,
        createBasicExtensions({ readonly: viewMode === 'readonly' }),
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
        ...(viewMode !== 'source' ? [decorateMarkdown()] : []),
      ],
    };
  }, [text, formattingObserver, viewMode, themeMode]);

  const handleToolbarAction = useActionHandler(view);
  const handleAction = (action: Action) => {
    if (action.type === 'view-mode') {
      setViewMode(action.data);
    } else {
      handleToolbarAction?.(action);
    }
  };

  const [_comments, setComments] = useState<Comment[]>([]);
  useComments(view, text.id, _comments);

  return (
    <div role='none' className='fixed inset-0 flex flex-col'>
      <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
        <Toolbar.View mode={viewMode} />
        <Toolbar.Markdown />
        <Toolbar.Custom onUpload={async (file) => ({ url: file.name })} />
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
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

const meta: Meta<typeof Toolbar.Root> = {
  title: 'plugins/plugin-markdown/Toolbar',
  component: Toolbar.Root,
  render: DefaultStory as any,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;
