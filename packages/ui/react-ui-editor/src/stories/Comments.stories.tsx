//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useContext, useMemo } from 'react';

import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { type Comment, annotations, comments, createExternalCommentSync } from '@dxos/ui-editor';

import { createRenderer, str } from '../util';

import { EditorStory, content, longText } from './components';

const meta = {
  title: 'ui/react-ui-editor/Comments',
  component: EditorStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Comments
//

const CommentsStory = () => {
  const registry = useContext(RegistryContext);
  const commentsAtom = useMemo(() => Atom.make<Comment[]>([]), []);

  return (
    <EditorStory
      text={str('# Comments', '', content.paragraphs, content.footer)}
      extensions={[
        createExternalCommentSync(
          'test',
          (sink) => registry.subscribe(commentsAtom, () => sink()),
          () => registry.get(commentsAtom),
        ),
        comments({
          id: 'test',
          renderTooltip: createRenderer(CommentTooltip),
          onCreate: ({ cursor }) => {
            const id = PublicKey.random().toHex();
            const current = registry.get(commentsAtom);
            registry.set(commentsAtom, [...current, { id, cursor }]);
            return id;
          },
          onSelect: (state) => {
            const debug = false;
            if (debug) {
              log.info('update', {
                comments: state.comments.length,
                active: state.selection.current?.slice(0, 8),
                closest: state.selection.closest?.slice(0, 8),
              });
            }
          },
        }),
      ]}
    />
  );
};

export const Comments: Story = {
  render: () => <CommentsStory />,
};

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded-sm text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const CommentTooltip: FC<{ shortcut: string }> = ({ shortcut }) => {
  return (
    <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded-sm'>
      <div>Create comment</div>
      <div className='flex gap-1'>
        {keySymbols(parseShortcut(shortcut)).map((char) => (
          <Key key={char} char={char} />
        ))}
      </div>
    </div>
  );
};

//
// Annotations
//

export const Annotations: Story = {
  render: () => (
    <EditorStory text={str('# Annotations', '', longText)} extensions={[annotations({ match: /volup/gi })]} />
  ),
};
