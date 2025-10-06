//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { type CommandMenuGroup, type CommandMenuItem, CommandMenuProvider } from '../components';
import { deleteItem, hashtag, listItemToString, outliner, treeFacet } from '../extensions';
import { str } from '../testing';

import { EditorStory } from './components';

type StoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  const viewRef = useRef<EditorView>(null);

  const commandGroups: CommandMenuGroup[] = useMemo(
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
    <CommandMenuProvider
      groups={commandGroups}
      onSelect={(item: CommandMenuItem) => {
        if (viewRef.current && item.onSelect) {
          return item.onSelect(viewRef.current, viewRef.current.state.selection.main.head);
        }
      }}
    >
      <EditorStory
        ref={viewRef}
        text={text}
        extensions={[outliner(), hashtag()]}
        placeholder=''
        debug='raw+tree'
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 overflow-auto text-xs text-green-800 dark:text-green-200'>{lines.join('\n')}</pre>;
        }}
      />
    </CommandMenuProvider>
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
