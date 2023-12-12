//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { DropdownMenu } from './DropdownMenu';
import { withTheme } from '../../testing';
import { Button } from '../Buttons';

const StorybookDropdownMenu = () => {
  return (
    <DropdownMenu.Root defaultOpen>
      <DropdownMenu.Trigger asChild>
        <Button>Customise options</Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
        <DropdownMenu.Viewport>
          <DropdownMenu.Item>
            <span className='grow'>New Tab</span>
            <span className='opacity-50'>⌘+T</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <span className='grow'>New Window</span>
            <span className='opacity-50'>⌘+N</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled>
            <span className='grow'>New Private Window</span>
            <span className='opacity-50'>⇧+⌘+N</span>
          </DropdownMenu.Item>
          {/* <DropdownMenu.Sub> */}
          {/*  <DropdownMenu.SubTrigger> */}
          {/*    More Tools */}
          {/*    <div> */}
          {/*      <ChevronRightIcon /> */}
          {/*    </div> */}
          {/*  </DropdownMenu.SubTrigger> */}
          {/*  <DropdownMenu.Portal> */}
          {/*    <DropdownMenu.SubContent sideOffset={2} alignOffset={-5}> */}
          {/*      <DropdownMenu.Item> */}
          {/*        Save Page As… <div>⌘+S</div> */}
          {/*      </DropdownMenu.Item> */}
          {/*      <DropdownMenu.Item>Create Shortcut…</DropdownMenu.Item> */}
          {/*      <DropdownMenu.Item>Name Window…</DropdownMenu.Item> */}
          {/*      <DropdownMenu.Separator /> */}
          {/*      <DropdownMenu.Item>Developer Tools</DropdownMenu.Item> */}
          {/*    </DropdownMenu.SubContent> */}
          {/*  </DropdownMenu.Portal> */}
          {/* </DropdownMenu.Sub> */}

          {/* <DropdownMenu.Separator /> */}

          {/* <DropdownMenu.CheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
          {/*  <DropdownMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </DropdownMenu.ItemIndicator> */}
          {/*  Show Bookmarks <div>⌘+B</div> */}
          {/* </DropdownMenu.CheckboxItem> */}
          {/* <DropdownMenu.CheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
          {/*  <DropdownMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </DropdownMenu.ItemIndicator> */}
          {/*  Show Full URLs */}
          {/* </DropdownMenu.CheckboxItem> */}

          <DropdownMenu.Separator />

          <DropdownMenu.GroupLabel>People</DropdownMenu.GroupLabel>
          {/* <DropdownMenu.RadioGroup value={person} onValueChange={setPerson}> */}
          {/*  <DropdownMenu.RadioItem value='pedro'> */}
          {/*    <DropdownMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </DropdownMenu.ItemIndicator> */}
          {/*    Pedro Duarte */}
          {/*  </DropdownMenu.RadioItem> */}
          {/*  <DropdownMenu.RadioItem value='colm'> */}
          {/*    <DropdownMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </DropdownMenu.ItemIndicator> */}
          {/*    Colm Tuite */}
          {/*  </DropdownMenu.RadioItem> */}
          {/* </DropdownMenu.RadioGroup> */}
        </DropdownMenu.Viewport>

        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default {
  component: StorybookDropdownMenu,
  decorators: [withTheme],
};

export const Default = {
  args: {},
  parameters: {
    chromatic: { delay: 1600 },
  },
};
