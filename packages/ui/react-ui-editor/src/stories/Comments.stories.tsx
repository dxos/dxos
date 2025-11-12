//
// Copyright 2023 DXOS.org
//

import { effect, useSignal } from '@preact/signals-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';

import { annotations, comments, createExternalCommentSync } from '../extensions';
import { type Comment } from '../types';
import { createRenderer, str } from '../util';

import { EditorStory, content, longText } from './components';

const meta = {
  title: 'ui/react-ui-editor/Comments',
  component: EditorStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Comments
//

export const Comments: Story = {
  render: () => {
    const _comments = useSignal<Comment[]>([]);
    return (
      <EditorStory
        text={str('# Comments', '', content.paragraphs, content.footer)}
        extensions={[
          createExternalCommentSync(
            'test',
            (sink) => effect(() => sink()),
            () => _comments.value,
          ),
          comments({
            id: 'test',
            renderTooltip: createRenderer(CommentTooltip),
            onCreate: ({ cursor }) => {
              const id = PublicKey.random().toHex();
              _comments.value = [..._comments.value, { id, cursor }];
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
  },
};

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const CommentTooltip: FC<{ shortcut: string }> = ({ shortcut }) => {
  return (
    <div className='flex items-center gap-2 pli-2 plb-2 bg-neutral-700 text-white text-xs rounded'>
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
