//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './util';
import { RefDropdownMenu } from '../components';
import { outliner, listItemToString, treeFacet } from '../extensions';
import { str } from '../testing';

type StoryProps = {
  text: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  return (
    <RefDropdownMenu.Provider>
      <EditorStory
        text={text}
        extensions={[outliner()]}
        placeholder=''
        slots={{}}
        debug='raw+tree'
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 text-xs text-green-800 dark:text-green-200 overflow-auto'>{lines.join('\n')}</pre>;
        }}
      />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item onClick={() => console.log('test')}>Test</DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </RefDropdownMenu.Provider>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-editor/Outliner',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: DefaultStory,
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
