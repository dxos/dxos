//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo, useRef } from 'react';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import {
  comments,
  createBasicExtensions,
  createComment,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  formattingKeymap,
} from '@dxos/ui-editor';
import { type Comment } from '@dxos/ui-editor/types';

import { translations } from '#translations';

import { Editor, type EditorController } from '../components';

random.seed(123);

const DOCUMENT_ID = 'test';

type StoryArgs = {
  content?: string;
  comments?: Comment[];
};

const DefaultStory = ({ content, comments: commentsProp = [] }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const registry = useContext(RegistryContext);
  const editorRef = useRef<EditorController>(null);
  const commentsAtom = useMemo(() => Atom.make<Comment[]>(commentsProp), []);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Type here...', lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: documentSlots }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      formattingKeymap(),
      comments({
        id: DOCUMENT_ID,
        // Append the new thread to the atom; the extension re-reads it via `getComments`/`subscribe`.
        onCreate: ({ cursor }) => {
          registry.set(commentsAtom, [...registry.get(commentsAtom), { id: PublicKey.random().toHex(), cursor }]);
        },
        onSelect: ({ comments, selection }) => {
          log.info('update', {
            comments: comments.length,
            active: selection.current?.slice(0, 8),
            closest: selection.closest?.slice(0, 8),
          });
        },
        getComments: () => registry.get(commentsAtom),
        subscribe: (sink) => {
          sink();
          return registry.subscribe(commentsAtom, () => sink());
        },
      }),
    ],
    [themeMode, registry, commentsAtom],
  );

  // Toolbar action that creates a comment on the current selection (mirrors the `meta-'` shortcut).
  const customActions = useMemo(
    () =>
      Atom.make(() => {
        const action = createMenuAction(
          'comment',
          () => {
            const view = editorRef.current?.view;
            if (view) {
              createComment(view);
            }
          },
          {
            label: 'Comment',
            icon: 'ph--chat-text--regular',
            iconOnly: true,
          },
        );

        return {
          nodes: [action],
          edges: [{ source: 'root', target: action.id, relation: 'child' as const }],
        };
      }),
    [],
  );

  return (
    <Editor.Root ref={editorRef} extensions={extensions}>
      <Editor.Content>
        <Editor.Toolbar classNames='dx-document' customActions={customActions} />
        <div className='dx-container dx-document bg-base-surface'>
          <Editor.View initialValue={content} selectionEnd />
        </div>
      </Editor.Content>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Comments',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    content: Array.from({ length: 3 })
      .map(() => random.lorem.paragraph(3))
      .join('\n\n'),
    comments: [
      { id: PublicKey.random().toHex(), cursor: '16:197' },
      { id: PublicKey.random().toHex(), cursor: '402:420' },
    ],
  },
};
