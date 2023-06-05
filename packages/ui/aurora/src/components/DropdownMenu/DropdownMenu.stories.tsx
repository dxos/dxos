//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Button } from '../Buttons';
import {
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroupLabel,
} from './DropdownMenu';

const StorybookDropdownMenu = () => {
  return (
    <DropdownMenuRoot defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button> Customise options</Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={4} collisionPadding={4}>
        <DropdownMenuItem>
          <span className='grow'>New Tab </span>
          <span className='opacity-50'>⌘+T</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span className='grow'>New Window </span>
          <span className='opacity-50'>⌘+N</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <span className='grow'>New Private Window </span>
          <span className='opacity-50'>⇧+⌘+N</span>
        </DropdownMenuItem>
        {/* <DropdownMenuSub> */}
        {/*  <DropdownMenuSubTrigger> */}
        {/*    More Tools */}
        {/*    <div> */}
        {/*      <ChevronRightIcon /> */}
        {/*    </div> */}
        {/*  </DropdownMenuSubTrigger> */}
        {/*  <DropdownMenuPortal> */}
        {/*    <DropdownMenuSubContent sideOffset={2} alignOffset={-5}> */}
        {/*      <DropdownMenuItem> */}
        {/*        Save Page As… <div>⌘+S</div> */}
        {/*      </DropdownMenuItem> */}
        {/*      <DropdownMenuItem>Create Shortcut…</DropdownMenuItem> */}
        {/*      <DropdownMenuItem>Name Window…</DropdownMenuItem> */}
        {/*      <DropdownMenuSeparator /> */}
        {/*      <DropdownMenuItem>Developer Tools</DropdownMenuItem> */}
        {/*    </DropdownMenuSubContent> */}
        {/*  </DropdownMenuPortal> */}
        {/* </DropdownMenuSub> */}

        {/* <DropdownMenuSeparator /> */}

        {/* <DropdownMenuCheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
        {/*  <DropdownMenuItemIndicator> */}
        {/*    <CheckIcon /> */}
        {/*  </DropdownMenuItemIndicator> */}
        {/*  Show Bookmarks <div>⌘+B</div> */}
        {/* </DropdownMenuCheckboxItem> */}
        {/* <DropdownMenuCheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
        {/*  <DropdownMenuItemIndicator> */}
        {/*    <CheckIcon /> */}
        {/*  </DropdownMenuItemIndicator> */}
        {/*  Show Full URLs */}
        {/* </DropdownMenuCheckboxItem> */}

        <DropdownMenuSeparator />

        <DropdownMenuGroupLabel>People</DropdownMenuGroupLabel>
        {/* <DropdownMenuRadioGroup value={person} onValueChange={setPerson}> */}
        {/*  <DropdownMenuRadioItem value='pedro'> */}
        {/*    <DropdownMenuItemIndicator> */}
        {/*      <DotFilledIcon /> */}
        {/*    </DropdownMenuItemIndicator> */}
        {/*    Pedro Duarte */}
        {/*  </DropdownMenuRadioItem> */}
        {/*  <DropdownMenuRadioItem value='colm'> */}
        {/*    <DropdownMenuItemIndicator> */}
        {/*      <DotFilledIcon /> */}
        {/*    </DropdownMenuItemIndicator> */}
        {/*    Colm Tuite */}
        {/*  </DropdownMenuRadioItem> */}
        {/* </DropdownMenuRadioGroup> */}

        <DropdownMenuArrow />
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
};

export default {
  component: StorybookDropdownMenu,
};

export const Default = {
  args: {},
  parameters: {
    chromatic: { delay: 1600 },
  },
};
