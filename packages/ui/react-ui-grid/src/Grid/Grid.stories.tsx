//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { type MouseEvent, type MutableRefObject, useCallback, useRef, useState } from 'react';

import { DropdownMenu, Popover } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const StoryGrid = ({ onEditingChange, ...props }: StoryGridProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null) as MutableRefObject<HTMLButtonElement>;

  const handleClick = useCallback((event: MouseEvent) => {
    const closestStoryAction = (event.target as HTMLElement).closest('button[data-story-action]');
    if (closestStoryAction) {
      triggerRef.current = closestStoryAction as HTMLButtonElement;
      return setMenuOpen(true);
    }
    const closestAccessory = (event.target as HTMLElement).closest('[data-dx-grid-accessory]');
    if (closestAccessory) {
      const action = closestAccessory.getAttribute('data-dx-grid-accessory');
      switch (action) {
        case 'invoke-multiselect':
          triggerRef.current = closestAccessory as HTMLButtonElement;
          return setPopoverOpen(true);
      }
    }
  }, []);

  return (
    <>
      <Grid.Root id='story' onEditingChange={onEditingChange}>
        <Grid.Content {...props} onClick={handleClick} />
      </Grid.Root>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => console.log('[Click on dropdown menu item]')}>Hello</DropdownMenu.Item>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.VirtualTrigger virtualRef={triggerRef} />
        <Popover.Content>
          <span>Multiselect options</span>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Root>
    </>
  );
};

export default {
  title: 'ui/react-ui-grid/Grid',
  component: StoryGrid,
  decorators: [withTheme],
  parameters: { layout: 'fullscreen' },
};

export const Basic: StoryObj<StoryGridProps> = {
  args: {
    id: 'story',
    initialCells: {
      grid: {
        '1,1': {
          accessoryHtml:
            '<button class="ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" data-story-action="menu"><svg><use href="/icons.svg#ph--arrow-right--regular"/></svg></button>',
          value: 'Weekly sales report',
        },
        '2,2': {
          value: '',
          accessoryHtml:
            '<dx-grid-multiselect-cell values=\'[{"label": "Peach"},{"label": "Plum"},{"label": "Pear"}]\'></dx-grid-multiselect-cell>',
        },
      },
    },
    columnDefault: {
      grid: {
        size: 180,
        resizeable: true,
      },
    },
    rowDefault: {
      grid: {
        size: 32,
        resizeable: true,
      },
    },
    columns: {
      grid: {
        0: { size: 200 },
        1: { size: 210 },
        2: { size: 230 },
        3: { size: 250 },
        4: { size: 270 },
      },
    },
    onAxisResize: (event) => {
      console.log('[axis resize]', event);
    },
    onEditingChange: (event) => {
      console.log('[edit]', event);
    },
  },
};
