//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { DropdownMenuPortal } from '@radix-ui/react-dropdown-menu';
import {
  Gear,
  File,
  FrameCorners,
  Crop,
  Check,
  EyeClosed,
  GridFour,
  LinkSimple,
  CaretRight,
  Person
} from 'phosphor-react';
import React, { ReactNode } from 'react';

import { Button } from '../Button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuItemIndicator,
  DropdownMenuSubTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from './DropdownMenu';

export default {
  component: DropdownMenu
};

interface RadixMenuItem {
  label: string;
  shortcut?: string;
  icon?: ReactNode;
}

interface User {
  name: string;
  url?: string;
}

const generalMenuItems: RadixMenuItem[] = [
  {
    label: 'New File',
    icon: <File className='mr-2 h-3.5 w-3.5' />,
    shortcut: '⌘+N'
  },
  {
    label: 'Settings',
    icon: <Gear className='mr-2 h-3.5 w-3.5' />,
    shortcut: '⌘+,'
  }
];

const regionToolMenuItems: RadixMenuItem[] = [
  {
    label: 'Frame',
    icon: <FrameCorners className='mr-2 h-3.5 w-3.5' />,
    shortcut: '⌘+F'
  },
  {
    label: 'Crop',
    icon: <Crop className='mr-2 h-3.5 w-3.5' />,
    shortcut: '⌘+S'
  }
];

const users: User[] = [
  {
    name: 'Adam',
    url: 'https://github.com/adamwathan.png'
  },
  {
    name: 'Steve',
    url: 'https://github.com/steveschoger.png'
  },
  {
    name: 'Robin',
    url: 'https://github.com/robinmalfait.png'
  }
];

export const Default = {
  args: {
    trigger: <Button>Open dropdown menu</Button>,
    children: (
      <>
        {generalMenuItems.map(({ label, icon, shortcut }, i) => (
          <DropdownMenuItem key={`${label}-${i}`}>
            {icon}
            <span className='flex-grow text-gray-700 dark:text-gray-300'>{label}</span>
            {shortcut && <span className='text-xs'>{shortcut}</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem checked={true}>
          <GridFour className='mr-2 h-4 w-4' />
          <span className='flex-grow text-gray-700 dark:text-gray-300'>Show Grid</span>
          <DropdownMenuItemIndicator>
            <Check className='h-3.5 w-3.5' />
          </DropdownMenuItemIndicator>
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem checked={true}>
          <EyeClosed className='mr-2 h-3.5 w-3.5' />
          <span className='flex-grow text-gray-700 dark:text-gray-300'>Show UI</span>
          <DropdownMenuItemIndicator>
            <Check className='h-3.5 w-3.5' />
          </DropdownMenuItemIndicator>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Region Tools</DropdownMenuLabel>

        {regionToolMenuItems.map(({ label, icon, shortcut }, i) => (
          <DropdownMenuItem key={`${label}-${i}`}>
            {icon}
            <span className='flex-grow text-gray-700 dark:text-gray-300'>{label}</span>
            {shortcut && <span className='text-xs'>{shortcut}</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LinkSimple className='mr-2 h-3.5 w-3.5' />
            <span className='flex-grow text-gray-700 dark:text-gray-300'>Share</span>
            <CaretRight className='h-3.5 w-3.5' />
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {users.map(({ name, url }, i) => (
                <DropdownMenuItem key={`${name}-${i}`}>
                  {url ? (
                    <img className='mr-2.5 h-6 w-6 rounded-full' src={url} />
                  ) : (
                    <Person className='mr-2.5 h-6 w-6' />
                  )}
                  <span className='text-gray-700 dark:text-gray-300'>{name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </>
    )
  }
};
