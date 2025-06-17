//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { effect, useSignal } from '@preact/signals-react';
import React, { type FC } from 'react';

import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, content, longText } from './util';
import { annotations, comments, createExternalCommentSync } from '../extensions';
import { str } from '../testing';
import { type Comment } from '../types';
import { createRenderer } from '../util';

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Comments',
  component: EditorStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

//
// Comments
//

export const Comments = {
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
    <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded'>
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

export const Annotations = {
  render: () => (
    <EditorStory text={str('# Annotations', '', longText)} extensions={[annotations({ match: /volup/gi })]} />
  ),
};
