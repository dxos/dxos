//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import React, { useRef } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { RefDropdownMenu } from '../components';
import { outliner, listItemToString, treeFacet, deleteItem, hashtag } from '../extensions';
import { str } from '../testing';

type StoryProps = {
  text: string;
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

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-editor/Outliner',
  render: DefaultStory,
  decorators: [withAttention, withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Empty = {
  args: {},
};

export const Basic = {
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

export const Nested = {
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

export const Continuation = {
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
