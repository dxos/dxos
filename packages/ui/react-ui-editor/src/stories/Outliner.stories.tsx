//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import {
  type MenuGroup,
  type MenuItem,
  MenuProvider,
  deleteItem,
  hashtag,
  listItemToString,
  outliner,
  treeFacet,
} from '../extensions';
import { str } from '../testing';

import { EditorStory } from './components';

type StoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  const viewRef = useRef<EditorView>(null);

  const commandGroups: MenuGroup[] = useMemo(
    () => [
      {
        id: 'outliner-actions',
        items: [
          {
            id: 'delete-row',
            label: 'Delete',
            onSelect: (view: EditorView) => {
              deleteItem(view);
            },
          },
        ],
      },
    ],
    [],
  );

  return (
    <MenuProvider
      groups={commandGroups}
      onSelect={(item: MenuItem) => {
        if (viewRef.current && item.onSelect) {
          return item.onSelect(viewRef.current, viewRef.current.state.selection.main.head);
        }
      }}
    >
      <EditorStory
        ref={viewRef}
        text={text}
        extensions={[outliner(), hashtag()]}
        debug='raw+tree'
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 overflow-auto text-xs text-green-800 dark:text-green-200'>{lines.join('\n')}</pre>;
        }}
      />
    </MenuProvider>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Outliner',
  render: DefaultStory,
  decorators: [withTheme, withAttention],
  parameters: {
    layout: 'fullscreen',
  },
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
