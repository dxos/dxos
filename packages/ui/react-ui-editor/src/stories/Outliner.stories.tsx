//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { RefDropdownMenu } from '../components';
import { deleteItem, hashtag, listItemToString, outliner, treeFacet } from '../extensions';
import { str } from '../testing';

import { EditorStory } from './components';

type StoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  const viewRef = useRef<EditorView>(null);

  const handleDelete = () => {
    if (viewRef.current) {
      deleteItem(viewRef.current);
    }
  };

  return (
    <RefDropdownMenu.Provider>
      <EditorStory
        ref={viewRef}
        text={text}
        extensions={[outliner(), hashtag()]}
        placeholder=''
        slots={{}}
        debug='raw+tree'
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 overflow-auto text-xs text-green-800 dark:text-green-200'>{lines.join('\n')}</pre>;
        }}
      />

      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item onClick={handleDelete}>Delete</DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </RefDropdownMenu.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Outliner',
  render: DefaultStory,
  decorators: [withAttention, withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {},
};

export const Basic: Story = {
  args: {
    text: str(
      //
      '- [ ] A',
      '- [ ] B',
      '- [ ] C',
      '- [ ] D',
      '- [ ] E',
      '- [ ] F',
      '- [ ] G',
    ),
  },
};

export const Nested: Story = {
  args: {
    text: str(
      //
      '- [ ] A',
      '  - [ ] B',
      '- [ ] C',
      '  - [ ] D',
      '    - [ ] E',
      '    - [ ] F',
      '- [ ] G',
    ),
  },
};

export const Continuation: Story = {
  args: {
    text: str(
      //
      '- [ ] A',
      '- [ ] B',
      'Continuation line.',
      '- [ ] C',
      '',
      '- [ ] D',
      '- [ ] E',
      '- [ ] F',
      '- [ ] G',
      '',
    ),
  },
};
