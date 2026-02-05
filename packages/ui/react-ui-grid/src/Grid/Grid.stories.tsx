//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type MouseEvent, type MutableRefObject, useCallback, useRef, useState } from 'react';

import { defaultRowSize } from '@dxos/lit-grid';
import { type DxGridPlaneCells } from '@dxos/lit-grid';
import { faker } from '@dxos/random';
import { DropdownMenu } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { toPlaneCellIndex } from '@dxos/react-ui-grid';
import { Combobox, type ComboboxRootProps, useSearchListResults } from '@dxos/react-ui-searchlist';

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
  const setMultiselectValue = useCallback<NonNullable<ComboboxRootProps['onValueChange']>>((nextValue) => {
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
    <div role='none' className='contents'>
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
      <Combobox.Root
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        value={multiSelectValue}
        onValueChange={setMultiselectValue}
      >
        <Combobox.VirtualTrigger virtualRef={triggerRef} />
        <ComboboxContentWithFiltering />
      </Combobox.Root>
    </div>
  );
};

const ComboboxContentWithFiltering = () => {
  const { results, handleSearch } = useSearchListResults({
    items: storybookItems,
  });

  return (
    <Combobox.Content onSearch={handleSearch}>
      <Combobox.Input placeholder='Search...' />
      <Combobox.List>
        {results.map((value) => (
          <Combobox.Item key={value} value={value} label={value} />
        ))}
      </Combobox.List>
      <Combobox.Arrow />
    </Combobox.Content>
  );
};

const meta = {
  title: 'ui/react-ui-grid/Grid',
  component: GridStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GridStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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

const cellSize = 40;

// TODO(burdon): Calendar.
export const Calendar: Story = {
  args: {
    id: 'story',
    limitColumns: 7,
    columnDefault: {
      grid: {
        size: cellSize,
        resizeable: false,
      },
    },
    rowDefault: {
      grid: {
        size: cellSize,
        resizeable: false,
      },
    },
    getCells: (range, plane) => {
      const cells: DxGridPlaneCells = {};
      if (plane === 'grid') {
        for (let col = range.start.col; col <= range.end.col; col++) {
          for (let row = range.start.row; row <= range.end.row; row++) {
            // TODO(burdon): Formatting changes when cell is selected.
            cells[toPlaneCellIndex({ col, row })] = {
              readonly: true,
              accessoryHtml: '<div class="flex bs-full is-full justify-center items-center overflow-hidden">0</div>',
              className: '',
            };
          }
        }
      }
      return cells;
    },
  },
  render: (args) => (
    <div className='bs-full flex justify-center'>
      <div className='bs-full is-[288px] border-x border-separator'>
        <GridStory {...args} />
      </div>
    </div>
  ),
};
