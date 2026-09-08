//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Menu } from './Menu';

const DefaultStory = () => {
  // NOTE(thure): Since long-tap will select text in some OSs, apply `select-none` to `Menu.ContextTrigger` where possible.
  return (
    <Menu.Root>
      <Menu.ContextTrigger className='select-none border border-dashed border-neutral-400/50 rounded-md flex items-center justify-center p-8 font-normal'>
        Right-click / long-tap here.
      </Menu.ContextTrigger>

      <Menu.Content collisionPadding={8}>
        <Menu.Viewport>
          <Menu.Item>
            <span className='grow'>New Tab</span>
            <span className='opacity-50'>⌘+T</span>
          </Menu.Item>
          <Menu.Item>
            <span className='grow'>New Window</span>
            <span className='opacity-50'>⌘+N</span>
          </Menu.Item>
          <Menu.Item disabled>
            <span className='grow'>New Private Window</span>
            <span className='opacity-50'>⇧+⌘+N</span>
          </Menu.Item>
          {/* <Menu.Sub> */}
          {/*  <Menu.SubTrigger> */}
          {/*    More Tools */}
          {/*    <div> */}
          {/*      <ChevronRightIcon /> */}
          {/*    </div> */}
          {/*  </Menu.SubTrigger> */}
          {/*  <Menu.Portal> */}
          {/*    <Menu.SubContent sideOffset={2} alignOffset={-5}> */}
          {/*      <Menu.Item> */}
          {/*        Save Page As… <div>⌘+S</div> */}
          {/*      </Menu.Item> */}
          {/*      <Menu.Item>Create Shortcut…</Menu.Item> */}
          {/*      <Menu.Item>Name Window…</Menu.Item> */}
          {/*      <Menu.Separator /> */}
          {/*      <Menu.Item>Developer Tools</Menu.Item> */}
          {/*    </Menu.SubContent> */}
          {/*  </Menu.Portal> */}
          {/* </Menu.Sub> */}

          {/* <Menu.Separator /> */}

          {/* <Menu.CheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
          {/*  <Menu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </Menu.ItemIndicator> */}
          {/*  Show Bookmarks <div>⌘+B</div> */}
          {/* </Menu.CheckboxItem> */}
          {/* <Menu.CheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
          {/*  <Menu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </Menu.ItemIndicator> */}
          {/*  Show Full URLs */}
          {/* </Menu.CheckboxItem> */}

          <Menu.Separator />

          <Menu.GroupLabel>People</Menu.GroupLabel>
          {/* <Menu.RadioGroup value={person} onValueChange={setPerson}> */}
          {/*  <Menu.RadioItem value='pedro'> */}
          {/*    <Menu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </Menu.ItemIndicator> */}
          {/*    Pedro Duarte */}
          {/*  </Menu.RadioItem> */}
          {/*  <Menu.RadioItem value='colm'> */}
          {/*    <Menu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </Menu.ItemIndicator> */}
          {/*    Colm Tuite */}
          {/*  </Menu.RadioItem> */}
          {/* </Menu.RadioGroup> */}
        </Menu.Viewport>

        <Menu.Arrow />
      </Menu.Content>
    </Menu.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Menu/ContextTrigger',
  component: Menu.Root as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
