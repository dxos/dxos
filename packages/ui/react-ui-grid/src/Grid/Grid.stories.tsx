//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type MouseEvent, type RefObject, useCallback, useRef, useState } from 'react';

import { defaultRowSize } from '@dxos/lit-grid';
import { type DxGridPlaneCells } from '@dxos/lit-grid';
import { random } from '@dxos/random';
import { Next } from '@dxos/react-ui';
import { toPlaneCellIndex } from '@dxos/react-ui-grid';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Grid, type GridContentProps, type GridEditing, type GridRootProps } from './Grid.tsx';

const storybookItems = random.helpers
  .uniqueArray(random.commerce.productName, 16)
  .map((name) => ({ value: name, label: name }));

type GridStoryArgs = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {
  const triggerRef = useRef<HTMLButtonElement>(null) as RefObject<HTMLButtonElement>;

  const [cells, setCells] = useState<GridContentProps['initialCells']>(initialCells);

  const [editing, setEditing] = useState<GridEditing>(null);
  const handleEditingChange = useCallback<NonNullable<GridRootProps['onEditingChange']>>((event) => {
    // TODO(burdon): Not working?
    setEditing(event ? { index: event.index, initialContent: '', cellElement: event.cellElement } : null);
  }, []);

  // Multiselect
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [multiSelectValue, setInternalMultiselectValue] = useState<string[]>([]);
  const setMultiselectValue = useCallback((nextValue: string[]) => {
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
    <div className='contents'>
      <Grid.Root id='story' editing={editing} onEditingChange={handleEditingChange}>
        {/* TODO(burdon): Why is this property not just "cells" or "values" */}
        <Grid.Content {...props} initialCells={cells} onClick={handleClick} />
      </Grid.Root>

      {/* Menu */}
      <Next.Menu.Root
        open={menuOpen}
        onOpenChange={({ open }) => setMenuOpen(open)}
        positioning={Next.virtualAnchor(triggerRef)}
      >
        <Next.Menu.Content>
          <Next.Menu.Item
            onClick={() => console.log('[Click on dropdown menu item]')}
            item={{ value: 'Hello', label: 'Hello' }}
          />
        </Next.Menu.Content>
      </Next.Menu.Root>

      {/* Multiselect */}
      <Next.Combobox.Root
        items={storybookItems}
        multiple
        open={popoverOpen}
        onOpenChange={({ open }) => setPopoverOpen(open)}
        value={multiSelectValue}
        onValueChange={({ value }) => setMultiselectValue(value)}
        positioning={Next.virtualAnchor(triggerRef)}
      >
        <Next.Combobox.Content>
          <Next.Combobox.Input placeholder='Search...' />
          <Next.Combobox.List />
        </Next.Combobox.Content>
      </Next.Combobox.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-grid/Grid',
  component: GridStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GridStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Single focusable cell — for verifying focus-ring alignment with grid lines.
 */
export const SingleCell: Story = {
  args: {
    id: 'story',
    limitColumns: 1,
    limitRows: 1,
    columnDefault: { grid: { size: 200, resizeable: false } },
    rowDefault: { grid: { size: 32, resizeable: false } },
    initialCells: {
      grid: {
        '0,0': { value: 'Focus me' },
      },
    },
  },
  render: (args) => (
    <div className='h-full grid place-items-center'>
      <GridStory {...args} />
    </div>
  ),
};

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
            <button class="dx-button w-6 px-0.5 min-h-0 absolute inset-y-1 right-1" data-story-action="menu">
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
              accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow-hidden">0</div>',
              className: '',
            };
          }
        }
      }
      return cells;
    },
  },
  render: (args) => (
    <div className='h-full flex justify-center'>
      <div className='h-full w-[288px] border-x border-separator'>
        <GridStory {...args} />
      </div>
    </div>
  ),
};
