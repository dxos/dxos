//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { deleteItem, hashtag, join, listItemToString, outliner, treeFacet } from '@dxos/ui-editor';

import { type EditorController, type EditorMenuGroup, EditorMenuProvider } from '../components';

import { EditorStory } from './components';

type StoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  const [controller, setController] = useState<EditorController | null>(null);

  const extensions = useMemo(() => [outliner(), hashtag()], []);
  const commandGroups: EditorMenuGroup[] = useMemo(
    () => [
      {
        id: 'outliner-actions',
        items: [
          {
            id: 'delete-row',
            label: 'Delete',
            onSelect: ({ view }) => {
              deleteItem(view);
            },
          },
        ],
      },
    ],
    [],
  );

  return (
    <EditorMenuProvider
      view={controller?.view}
      groups={commandGroups}
      onSelect={({ view, item }) => {
        if (item.onSelect) {
          return item.onSelect({ view, head: view.state.selection.main.head });
        }
      }}
    >
      <EditorStory
        ref={setController}
        text={text}
        extensions={extensions}
        debug='raw+tree'
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 overflow-auto text-xs text-green-800 dark:text-green-200'>{lines.join('\n')}</pre>;
        }}
      />
    </EditorMenuProvider>
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
    text: join(
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
    text: join(
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
    text: join(
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
