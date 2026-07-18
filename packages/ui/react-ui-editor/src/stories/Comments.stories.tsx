//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { comments } from '@dxos/ui-editor';
import { type Comment } from '@dxos/ui-editor/types';

import { EditorStory } from './components';

random.seed(123);

type StoryArgs = {
  content?: string;
  comments?: Comment[];
};

const DefaultStory = ({ content, comments: commentsProp = [] }: StoryArgs) => {
  const registry = useContext(RegistryContext);
  const commentsAtom = useMemo(() => Atom.make<Comment[]>(commentsProp), []);

  return (
    <EditorStory
      id='test'
      text={content}
      extensions={[
        comments({
          id: 'test',
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
      ]}
    />
  );
};

const meta = {
  title: 'ui/react-ui-editor/Comments',
  component: EditorStory,
  render: (args) => <DefaultStory {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

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
