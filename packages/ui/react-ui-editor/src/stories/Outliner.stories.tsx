//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Button, Popover } from '@dxos/react-ui';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './util';
import { outliner, listItemToString, treeFacet, floatingMenu } from '../extensions';
import { RefPopover, str } from '../testing';

type StoryProps = {
  text: string;
};

// TODO(burdon): Close?
const MenuPopover = () => {
  return (
    <Popover.Portal>
      <Popover.Content>
        <Popover.Viewport>
          <Button onClick={() => console.log('!')}>Test</Button>
          {/* <DropdownMenu.Root>
            <DropdownMenu.Content>
              <DropdownMenu.Item>Test</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root> */}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

const DefaultStory = ({ text }: StoryProps) => {
  return (
    <RefPopover.Provider>
      <EditorStory
        text={text}
        extensions={[outliner(), floatingMenu()]}
        debug='raw+tree'
        placeholder=''
        debugCustom={(view) => {
          const tree = view.state.facet(treeFacet);
          const lines: string[] = [];
          tree.traverse((item) => lines.push(listItemToString(item)));
          return <pre className='p-1 text-xs text-green-800 dark:text-green-200 overflow-auto'>{lines.join('\n')}</pre>;
        }}
      />
      <MenuPopover />
    </RefPopover.Provider>
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
