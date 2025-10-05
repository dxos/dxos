//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type MouseEvent, type MutableRefObject, useCallback, useRef, useState } from 'react';

import { defaultRowSize } from '@dxos/lit-grid';
import { faker } from '@dxos/random';
import { DropdownMenu } from '@dxos/react-ui';
import { PopoverCombobox, type PopoverComboboxRootProps } from '@dxos/react-ui-searchlist';

import { Grid, type GridContentProps, type GridEditing, type GridRootProps } from './Grid';

const storybookItems = faker.helpers.uniqueArray(faker.commerce.productName, 16);

type GridStoryProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const GridStory = ({ initialCells, ...props }: GridStoryProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null) as MutableRefObject<HTMLButtonElement>;

  const [cells, setCells] = useState<GridContentProps['initialCells']>(initialCells);

  const [editing, setEditing] = useState<GridEditing>(null);
  const handleEditingChange = useCallback<NonNullable<GridRootProps['onEditingChange']>>((event) => {
    // TODO(burdon): Not working?
    setEditing(event ? { index: event.index, initialContent: '', cellElement: event.cellElement } : null);
  }, []);

  // Multiselect
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [multiSelectValue, setInternalMultiselectValue] = useState('');
  const setMultiselectValue = useCallback<NonNullable<PopoverComboboxRootProps['onValueChange']>>((nextValue) => {
    setInternalMultiselectValue(nextValue);
    setCells((cells) => {
      // TODO(burdon): How can we get the cell address to update?
      console.log('[setMultiselectValue]', nextValue);
      return cells;
    });
  }, []);

  // Menu
  const [menuOpen, setMenuOpen] = useState(false);

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
        case 'invoke-multiselect': {
          triggerRef.current = closestAccessory as HTMLButtonElement;
          return setPopoverOpen(true);
        }
      }
    }
  }, []);

  return (
    <div role='none' className='fixed inset-0 grid'>
      <Grid.Root id='story' editing={editing} onEditingChange={handleEditingChange}>
        {/* TODO(burdon): Why is this property not just "cells" or "values" */}
        <Grid.Content {...props} initialCells={cells} onClick={handleClick} />
      </Grid.Root>

      {/* Menu */}
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => console.log('[Click on dropdown menu item]')}>Hello</DropdownMenu.Item>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Multiselect */}
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
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-grid/Grid',
  component: GridStory,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GridStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
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
        size: defaultRowSize,
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
    initialCells: {
      grid: {
        '1,1': {
          value: 'Demo decoration',
          accessoryHtml: `
            <button class="dx-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" data-story-action="menu">
              <svg><use href="/icons.svg#ph--arrow-right--regular"/></svg>
            </button>
          `,
        },
        '2,1': {
          // accessoryHtml: `<dx-grid-multiselect-cell ${value ? `values='${JSON.stringify([{ label: value }])}'` : ''} placeholder="Select…"></dx-grid-multiselect-cell>`,
          accessoryHtml: '<dx-grid-multiselect-cell placeholder="Select…"></dx-grid-multiselect-cell>',
        },
      },
    },
    onAxisResize: (event) => {
      console.log('[axis resize]', event);
    },
  },
};

// TODO(burdon): How to make single-column?
export const SingleColumn: Story = {
  args: {
    id: 'story',
    limitColumns: 1,
    columnDefault: {
      grid: {
        size: 180,
      },
    },
    rowDefault: {
      grid: {
        size: defaultRowSize,
        resizeable: false,
      },
    },
    columns: {
      grid: {
        0: { size: 200 },
      },
    },
  },
};
