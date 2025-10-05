//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';


import { ContextMenu } from './ContextMenu';

const DefaultStory = () => {
  // NOTE(thure): Since long-tap will select text in some OSs, apply `select-none` to `ContextMenu.Trigger` where possible.
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className='select-none border border-dashed border-neutral-400/50 rounded-md flex items-center justify-center p-8 font-normal'>
        Right-click / long-tap here.
      </ContextMenu.Trigger>

      <ContextMenu.Content collisionPadding={8}>
        <ContextMenu.Viewport>
          <ContextMenu.Item>
            <span className='grow'>New Tab</span>
            <span className='opacity-50'>⌘+T</span>
          </ContextMenu.Item>
          <ContextMenu.Item>
            <span className='grow'>New Window</span>
            <span className='opacity-50'>⌘+N</span>
          </ContextMenu.Item>
          <ContextMenu.Item disabled>
            <span className='grow'>New Private Window</span>
            <span className='opacity-50'>⇧+⌘+N</span>
          </ContextMenu.Item>
          {/* <ContextMenu.Sub> */}
          {/*  <ContextMenu.SubTrigger> */}
          {/*    More Tools */}
          {/*    <div> */}
          {/*      <ChevronRightIcon /> */}
          {/*    </div> */}
          {/*  </ContextMenu.SubTrigger> */}
          {/*  <ContextMenu.Portal> */}
          {/*    <ContextMenu.SubContent sideOffset={2} alignOffset={-5}> */}
          {/*      <ContextMenu.Item> */}
          {/*        Save Page As… <div>⌘+S</div> */}
          {/*      </ContextMenu.Item> */}
          {/*      <ContextMenu.Item>Create Shortcut…</ContextMenu.Item> */}
          {/*      <ContextMenu.Item>Name Window…</ContextMenu.Item> */}
          {/*      <ContextMenu.Separator /> */}
          {/*      <ContextMenu.Item>Developer Tools</ContextMenu.Item> */}
          {/*    </ContextMenu.SubContent> */}
          {/*  </ContextMenu.Portal> */}
          {/* </ContextMenu.Sub> */}

          {/* <ContextMenu.Separator /> */}

          {/* <ContextMenu.CheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
          {/*  <ContextMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </ContextMenu.ItemIndicator> */}
          {/*  Show Bookmarks <div>⌘+B</div> */}
          {/* </ContextMenu.CheckboxItem> */}
          {/* <ContextMenu.CheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
          {/*  <ContextMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </ContextMenu.ItemIndicator> */}
          {/*  Show Full URLs */}
          {/* </ContextMenu.CheckboxItem> */}

          <ContextMenu.Separator />

          <ContextMenu.GroupLabel>People</ContextMenu.GroupLabel>
          {/* <ContextMenu.RadioGroup value={person} onValueChange={setPerson}> */}
          {/*  <ContextMenu.RadioItem value='pedro'> */}
          {/*    <ContextMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </ContextMenu.ItemIndicator> */}
          {/*    Pedro Duarte */}
          {/*  </ContextMenu.RadioItem> */}
          {/*  <ContextMenu.RadioItem value='colm'> */}
          {/*    <ContextMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </ContextMenu.ItemIndicator> */}
          {/*    Colm Tuite */}
          {/*  </ContextMenu.RadioItem> */}
          {/* </ContextMenu.RadioGroup> */}
        </ContextMenu.Viewport>

        <ContextMenu.Arrow />
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/ContextMenu',
  component: ContextMenu.Root as any,
  render: DefaultStory,
    parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    chromatic: { delay: 1600 },
  },
};
