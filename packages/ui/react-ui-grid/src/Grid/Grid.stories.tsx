//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type MouseEvent, type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type DxGridPlaneCells, defaultRowSize } from '@dxos/lit-grid';
import { type DxGridPlane, parseCellIndex } from '@dxos/lit-grid';
import { random } from '@dxos/random';
import { toPlaneCellIndex } from '@dxos/react-ui-grid';
import * as Combobox from '@dxos/react-ui/Combobox';
import * as Menu from '@dxos/react-ui/Menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { GridCellEditor, editorKeys } from '../CellEditor/index.ts';
import { type GridAddressing } from '../selection/index.ts';
import { type DxGridElement, Grid, type GridContentProps, type GridEditing, type GridRootProps } from './Grid.tsx';
import { useGridContext } from './GridContext.ts';

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
      <Menu.Root
        open={menuOpen}
        onOpenChange={({ open }) => setMenuOpen(open)}
        positioning={VirtualAnchor.virtualAnchor(triggerRef)}
      >
        <Menu.Content>
          <Menu.Item
            onClick={() => console.log('[Click on dropdown menu item]')}
            item={{ value: 'Hello', label: 'Hello' }}
          />
        </Menu.Content>
      </Menu.Root>

      {/* Multiselect */}
      <Combobox.Root
        items={storybookItems}
        multiple
        open={popoverOpen}
        onOpenChange={({ open }) => setPopoverOpen(open)}
        value={multiSelectValue}
        onValueChange={({ value }) => setMultiselectValue(value)}
        positioning={VirtualAnchor.virtualAnchor(triggerRef)}
      >
        <Combobox.Content>
          <Combobox.Input placeholder='Search...' />
          <Combobox.List />
        </Combobox.Content>
      </Combobox.Root>
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
            <button class="dx-control dx-button dx-button-square absolute inset-y-1 right-1" data-size="sm" data-story-action="menu">
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

const SelectionProbe = ({ peerColor = 'red' }: { peerColor?: string }) => {
  const { selection } = useGridContext('SelectionProbe');
  const local = useAtomValue(selection.local);
  return (
    <>
      <output data-testid='selection'>{local ? `${local.anchor.col}:${local.anchor.row}` : ''}</output>
      <output data-testid='selection-range'>{local ? `${local.anchor.row}-${local.head.row}` : ''}</output>
      <button
        onPointerDown={(event) => event.preventDefault()}
        onClick={() =>
          selection.setPeers([
            {
              peerId: 'peer',
              name: 'Peer',
              color: peerColor,
              selection: { anchor: { col: 'a', row: 'r3' }, head: { col: 'a', row: 'r3' } },
            },
          ])
        }
      >
        Peer selects
      </button>
    </>
  );
};

const SelectionStory = ({ addressed = true, peerColor }: { addressed?: boolean; peerColor?: string }) => {
  // Taller than the viewport, as real sheets and tables are, so a row change does not change the visible range.
  const [rows, setRows] = useState(() => Array.from({ length: 50 }, (_row, index) => `r${index + 1}`));
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  // The last range the grid reported to its consumer, which the sheet publishes as ViewState.
  const [reported, setReported] = useState('');
  // Closes the editor the way the sheet does: Enter moves focus to the next row, Escape returns it to the cell.
  const extensions = useMemo(
    () => [editorKeys({ onClose: (_value, { key }) => dxGrid?.refocus(key === 'Escape' ? undefined : 'row', 1) })],
    [dxGrid],
  );
  const addressing = useMemo<GridAddressing>(
    () => ({
      toId: ({ plane, col, row }) =>
        plane === 'grid' && col === 0 && rows[row] ? { col: 'a', row: rows[row] } : undefined,
      toPosition: ({ col, row }) =>
        col === 'a' && rows.includes(row) ? { plane: 'grid', col: 0, row: rows.indexOf(row) } : undefined,
    }),
    [rows],
  );

  return (
    <Grid.Root id='selection'>
      <button onPointerDown={(event) => event.preventDefault()} onClick={() => setRows((rows) => ['r0', ...rows])}>
        Insert row above
      </button>
      <button
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setRows((rows) => rows.filter((_row, index) => index !== 1))}
      >
        Delete second row
      </button>
      <button onPointerDown={(event) => event.preventDefault()} onClick={() => setRows((rows) => rows.slice(0, -1))}>
        Delete last row
      </button>
      <button
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setRows((rows) => (rows.includes('r2') ? rows : ['r2', ...rows]))}
      >
        Restore r2 at top
      </button>
      <button>Elsewhere</button>
      <output data-testid='reported'>{reported}</output>
      <SelectionProbe peerColor={peerColor} />
      <GridCellEditor extensions={extensions} getCellContent={() => ''} />
      <Grid.Content
        ref={setDxGrid}
        limitColumns={1}
        limitRows={rows.length}
        frozen={{ frozenRowsStart: 1 }}
        columnDefault={{ grid: { size: 120 } }}
        rowDefault={{ frozenRowsStart: { size: 32, readonly: true }, grid: { size: 32 } }}
        addressing={addressed ? addressing : undefined}
        onSelect={(event) => setReported(`${event.range.start.row}-${event.range.end.row}`)}
      />
    </Grid.Root>
  );
};

/**
 * Closing a cell editor moves focus with `refocus`, which dispatches no selection event; the selection still follows.
 */
export const SelectionFollowsRefocus: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    await expect(dxGrid).not.toBeNull();
    dxGrid?.refocus('row', 1);
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));
  },
};

/**
 * The focus `refocus` moves arrives while the closing editor's state is still set; the selection still follows.
 */
export const SelectionFollowsEditorClose: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('x{Enter}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.1')));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));
  },
};

/**
 * A range set from outside the grid (a companion, the assistant) survives focus returning to the focused cell.
 */
export const SelectionSurvivesRefocusAfterSetSelection: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = await canvas.findByTestId('grid.0.0');
    await userEvent.click(cell);
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    await expect(dxGrid).not.toBeNull();
    dxGrid?.setSelection({ start: { plane: 'grid', col: 0, row: 1 }, end: { plane: 'grid', col: 0, row: 2 } });
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));

    // Focus leaves and returns, as when the window regains focus.
    cell.blur();
    cell.focus();
    await waitFor(() => expect(document.activeElement).toBe(cell));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r2');
  },
};

/**
 * A header names no cell, so focusing it leaves no selection for collaborators to show.
 */
export const SelectionClearsOnHeaderFocus: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));

    const header = canvas.getByTestId('frozenRowsStart.0.0');
    await userEvent.click(header);
    await waitFor(() => expect(document.activeElement).toBe(header));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe(''));
  },
};

/**
 * A row change elsewhere leaves focus on a header.
 */
export const HeaderKeepsFocusOnRowChange: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));

    const header = canvas.getByTestId('frozenRowsStart.0.0');
    await userEvent.click(header);
    await waitFor(() => expect(document.activeElement).toBe(header));

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    // Give a focus move queued by the grid time to run.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.activeElement).toBe(header);
  },
};

/**
 * A row change while a cell editor is open leaves the editor focused, so the half-typed value is not committed.
 */
export const EditorKeepsFocusOnRowChange: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Enter}');
    const editor = await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('x');

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    // Give a focus move queued by the grid time to run.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(editor.isConnected).toBe(true);
    await expect(editor.contains(document.activeElement)).toBe(true);
  },
};

/**
 * Escape after picking a formula range returns to the edited cell; the picked range is not the user's selection.
 */
export const EscapeAfterRangePickKeepsCell: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    await expect(dxGrid).not.toBeNull();
    if (dxGrid) {
      // The sheet switches to this mode while the formula under the cursor can take a range.
      dxGrid.mode = 'edit-select';
    }
    await userEvent.click(canvas.getByTestId('grid.0.2'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.0')));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r1');
  },
};

/**
 * Escape moves focus to the grid; Enter moves it back into the first visible cell, which becomes the selection.
 */
export const SelectionFollowsFocusIntoPlane: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));

    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.0')));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r1'));
  },
};

/**
 * When the selected row is no longer shown (deleted, or hidden by a filter), the selection keeps naming it rather
 * than the row the grid now shows there.
 */
export const SelectionKeepsIdWhenRowIsGone: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));

    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r2');
  },
};

/**
 * When the selected row moves, the grid reports the selection's new position to its consumer.
 */
export const RowMoveIsReported: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('1-1'));

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('2-2'));
  },
};

/**
 * Closing an editor with Enter reports the cell focus moved to.
 */
export const EditorCloseIsReported: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('0-0'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('x{Enter}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('1-1'));
  },
};

/**
 * A range set while a header has focus moves with its rows, and focus stays on the header.
 */
export const HeaderKeepsFocusAfterSetSelection: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = await canvas.findByTestId('frozenRowsStart.0.0');
    await userEvent.click(header);
    await waitFor(() => expect(document.activeElement).toBe(header));

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    dxGrid?.setSelection({ start: { plane: 'grid', col: 0, row: 0 }, end: { plane: 'grid', col: 0, row: 2 } });
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r1-r3'));

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('1-3'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.activeElement).toBe(header);
  },
};

/**
 * When the row at one end of a range is gone, the range keeps naming both ends.
 */
export const RangeKeepsIdsWhenEndIsGone: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r2-r4'));

    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection-range').textContent).toBe('r2-r4');
  },
};

/**
 * Escape from an editor opened on a range returns to that range.
 */
export const EscapeKeepsRange: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r2-r3'));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection-range').textContent).toBe('r2-r3');
  },
};

/**
 * Leaving an editor for elsewhere after picking a formula range returns to the selection from before the edit.
 */
export const BlurAfterRangePickKeepsSelection: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r1-r1'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    if (dxGrid) {
      dxGrid.mode = 'edit-select';
    }
    await userEvent.click(canvas.getByTestId('grid.0.4'));
    await userEvent.click(canvas.getByRole('button', { name: 'Elsewhere' }));
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection-range').textContent).toBe('r1-r1');
  },
};

/**
 * Escape from an editor after a row was inserted above returns to the same row, not the row now at its position.
 */
export const EscapeAfterRowChangeKeepsRow: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.4'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r5'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r5');
    await expect(document.activeElement).toBe(canvas.getByTestId('grid.0.5'));
  },
};

/**
 * Escape after picking a formula range and a row insert above returns focus and selection to the edited row.
 */
export const EscapeAfterRangePickAndRowChangeKeepsRow: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.4'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r5'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    if (dxGrid) {
      dxGrid.mode = 'edit-select';
    }
    await userEvent.click(canvas.getByTestId('grid.0.7'));
    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r5');
    await expect(document.activeElement).toBe(canvas.getByTestId('grid.0.5'));
  },
};

/**
 * Escape from an edit of a cell outside a range set from elsewhere leaves focus on the edited cell.
 */
export const EscapeKeepsFocusOffRange: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const edited = await canvas.findByTestId('grid.0.9');
    await userEvent.click(edited);
    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    dxGrid?.setSelection({ start: { plane: 'grid', col: 0, row: 0 }, end: { plane: 'grid', col: 0, row: 2 } });
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r1-r3'));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.activeElement).toBe(edited);
  },
};

/**
 * Escape after the edited row was deleted meanwhile keeps naming that row, not the row now at its position.
 */
export const EscapeAfterRowIsGoneKeepsId: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r2');
  },
};

/**
 * A selected row that comes back at another position takes the grid's focus and highlight with it.
 */
export const SelectionFollowsRowThatComesBack: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));

    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Restore r2 at top' }));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('0-0'));
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.0')));
  },
};

/**
 * Leaving an editor for something outside the grid leaves focus there.
 */
export const EditorBlurLeavesFocusOutside: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('x');

    const elsewhere = canvas.getByRole('button', { name: 'Elsewhere' });
    await userEvent.click(elsewhere);
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.activeElement).toBe(elsewhere);
  },
};

/**
 * After leaving the grid through its editor, a row change elsewhere does not pull focus back into the grid.
 */
export const RowChangeLeavesFocusOutside: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    const elsewhere = canvas.getByRole('button', { name: 'Elsewhere' });
    await userEvent.click(elsewhere);
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(elsewhere));

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('2-2'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.activeElement).toBe(elsewhere);
  },
};

/**
 * Editing the cell the grid highlights after the selected row is gone selects that cell.
 */
export const EditAfterRowIsGoneSelectsEditedCell: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r3'));
  },
};

/**
 * Editing a cell after one end of the selected range is gone selects the edited cell, not the rows now at the range's
 * old positions.
 */
export const EditAfterRangeEndIsGoneSelectsEditedCell: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r2-r4'));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r3-r3'));
  },
};

/**
 * Editing the highlighted cell after the selected row is gone, while a row is inserted above, ends on the edited row.
 */
export const EditAfterRowIsGoneAndRowChangeSelectsEditedRow: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete second row' }));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r3-r3'));
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.2')));
  },
};

/**
 * Without addressing the grid records no selection, so an edit leaves the grid's own range as it was.
 */
export const UnaddressedEditKeepsRange: Story = {
  render: () => <SelectionStory addressed={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await waitFor(() => expect(canvas.getByTestId('reported').textContent).toBe('1-2'));

    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('grid.cell-editor')).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('reported').textContent).toBe('1-2');
  },
};

/**
 * A collaborator's color is drawn only as a color: a value that names an image is not loaded.
 */
export const PeerColorIsOnlyAColor: Story = {
  render: () => <SelectionStory peerColor='url("https://example.invalid/label.png")' />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Peer selects' }));
    const outline = await canvas.findByTestId('dx-grid.remote-selection');
    const label = outline.querySelector('.dx-grid__remote-selection__label');
    await expect(label).not.toBeNull();
    await expect(label && getComputedStyle(label).backgroundImage).toBe('none');
  },
};

/**
 * A collaborator's selection arriving mid-formula leaves the grid in range-picking mode.
 */
export const PeerSelectionKeepsRangePickMode: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.0'));
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    if (dxGrid) {
      dxGrid.mode = 'edit-select';
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Peer selects' }));
    await waitFor(() => expect(canvas.getByTestId('dx-grid.remote-selection')).toBeTruthy());
    await expect(dxGrid?.mode).toBe('edit-select');
  },
};

/**
 * When the last row is deleted, a range ending on it keeps naming both ends rather than collapsing.
 */
export const RangeKeepsIdsWhenLastRowIsDeleted: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dxGrid = canvasElement.querySelector<DxGridElement>('dx-grid');
    await canvas.findByTestId('grid.0.0');
    dxGrid?.setSelection({ start: { plane: 'grid', col: 0, row: 47 }, end: { plane: 'grid', col: 0, row: 49 } });
    await waitFor(() => expect(canvas.getByTestId('selection-range').textContent).toBe('r48-r50'));

    await userEvent.click(canvas.getByRole('button', { name: 'Delete last row' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(canvas.getByTestId('selection-range').textContent).toBe('r48-r50');
  },
};

/**
 * A selection is named by its row, so when a row is inserted above, the grid's focus moves with the selected row.
 */
export const SelectionStaysOnRow: Story = {
  render: () => <SelectionStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('grid.0.1'));
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r2'));

    // The button keeps focus in the grid, as a collaborator's insert would.
    await userEvent.click(canvas.getByRole('button', { name: 'Insert row above' }));
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.0.2')));
    await expect(canvas.getByTestId('selection').textContent).toBe('a:r2');

    // The grid's own focus moved too, so the next key starts from the selected row.
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(canvas.getByTestId('selection').textContent).toBe('a:r3'));
  },
};

//
// Docs
//

const BUDGET_COLUMNS = ['Item', 'Q1', 'Q2', 'Q3', 'Total'];

const BUDGET_TOTAL = BUDGET_COLUMNS.length - 1;

const BUDGET_ROWS = [
  ['Hosting', '1200', '1350', '1400'],
  ['Design', '800', '650', '900'],
  ['Support', '400', '420', '380'],
  ['Travel', '300', '0', '550'],
  // Blank rows and columns run past the frame, as in a spreadsheet.
  ...Array.from({ length: 40 }, () => ['', '', '', '']),
];

const budgetTotal = (row: string[]) =>
  row.every((value) => value === '')
    ? ''
    : String(row.slice(1, BUDGET_TOTAL).reduce((sum, value) => sum + (Number(value) || 0), 0));

const budgetCells = (rows: string[][], plane: DxGridPlane): DxGridPlaneCells =>
  plane === 'frozenRowsStart'
    ? Object.fromEntries(BUDGET_COLUMNS.map((label, col) => [`${col},0`, { value: label, readonly: true }]))
    : Object.fromEntries(
        rows.flatMap((row, rowIndex) => [
          ...row.map((value, col) => [`${col},${rowIndex}`, { value }]),
          [`${BUDGET_TOTAL},${rowIndex}`, { value: budgetTotal(row), readonly: true }],
        ]),
      );

const BudgetStory = () => {
  const [rows, setRows] = useState(BUDGET_ROWS);
  const [editing, setEditing] = useState<GridEditing>(null);
  const [grid, setGrid] = useState<DxGridElement | null>(null);
  const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
    (_range, plane) => budgetCells(rows, plane),
    [rows],
  );
  const extensions = useMemo(
    () => [
      editorKeys({
        onClose: (_value, event) => event && grid?.refocus(event.key === 'Tab' ? 'col' : 'row', event.shift ? -1 : 1),
      }),
    ],
    [grid],
  );

  return (
    <div className='fixed inset-0 flex flex-col dx-base-surface'>
      <Grid.Root id='budget' editing={editing} onEditingChange={setEditing}>
        <GridCellEditor
          getCellContent={(index) => rows[parseCellIndex(index).row]?.[parseCellIndex(index).col]}
          extensions={extensions}
          onBlur={(value) => {
            if (value !== undefined && editing) {
              const { col, row } = parseCellIndex(editing.index);
              setRows((current) =>
                current.map((cells, index) =>
                  index === row ? cells.map((cell, column) => (column === col ? value : cell)) : cells,
                ),
              );
            }
          }}
        />
        <Grid.Content
          ref={setGrid}
          limitColumns={BUDGET_COLUMNS.length + 6}
          limitRows={rows.length}
          frozen={{ frozenRowsStart: 1 }}
          columnDefault={{ frozenRowsStart: { size: 112, readonly: true }, grid: { size: 112 } }}
          rowDefault={{ frozenRowsStart: { size: 32, readonly: true }, grid: { size: 32 } }}
          getCells={getCells}
          overscroll='trap'
        />
      </Grid.Root>
    </div>
  );
};

/** The docs' spreadsheet: a budget whose totals follow its cells, with blank rows and columns past the frame. */
export const Docs: Story = {
  render: () => <BudgetStory />,
};
