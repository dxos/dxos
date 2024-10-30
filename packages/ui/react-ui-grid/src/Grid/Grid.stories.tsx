//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { type MouseEvent, type MutableRefObject, useCallback, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { DropdownMenu } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';
import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const storybookItems = faker.helpers.uniqueArray(faker.commerce.productName, 16);

const storybookInitialCells = (value?: string) => ({
  grid: {
    '1,1': {
      accessoryHtml:
        '<button class="ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" data-story-action="menu"><svg><use href="/icons.svg#ph--arrow-right--regular"/></svg></button>',
      value: 'Weekly sales report',
    },
    '2,2': {
      accessoryHtml: `<dx-grid-multiselect-cell ${value ? `values='${JSON.stringify([{ label: value }])}'` : ''} placeholder="Select…"></dx-grid-multiselect-cell>`,
    },
  },
});

const StoryGrid = ({ onEditingChange, ...props }: StoryGridProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [multiSelectValue, setInternalMultiselectValue] = useState('');
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

  const [initialCells, setInitialCells] = useState<GridContentProps['initialCells']>(storybookInitialCells());

  const setMultiselectValue = useCallback((nextValue: string) => {
    const nextInitialCells = storybookInitialCells(nextValue);
    console.log('[set initial cells]', nextInitialCells);
    setInitialCells(nextInitialCells);
    setInternalMultiselectValue(nextValue);
  }, []);

  return (
    <>
      <Grid.Root id='story' onEditingChange={onEditingChange}>
        <Grid.Content {...props} initialCells={initialCells} onClick={handleClick} />
      </Grid.Root>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => console.log('[Click on dropdown menu item]')}>Hello</DropdownMenu.Item>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <PopoverCombobox.Root
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        value={multiSelectValue}
        onValueChange={setMultiselectValue}
      >
        <PopoverCombobox.VirtualTrigger virtualRef={triggerRef} />
        <PopoverCombobox.Content filter={(value, search) => (value.includes(search) ? 1 : 0)}>
          <PopoverCombobox.Input placeholder='Search...' />
          <PopoverCombobox.List>
            {storybookItems.map((value) => (
              <PopoverCombobox.Item key={value}>{value}</PopoverCombobox.Item>
            ))}
          </PopoverCombobox.List>
          <PopoverCombobox.Arrow />
        </PopoverCombobox.Content>
      </PopoverCombobox.Root>
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
