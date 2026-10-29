//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Input from '@dxos/react-ui/Input';
import * as UiListbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withSizes, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { translations } from '@dxos/react-ui/translations';
import * as Typography from '@dxos/react-ui/Typography';

import { type ReorderListController, useReorderItem, useReorderList } from '../../hooks/index.ts';
import { Listbox } from './Listbox.tsx';
import { listboxSelection } from './selection.ts';

const ITEMS: UiListbox.Option[] = [
  { value: 'alpha', label: 'Alpha', description: 'The first letter' },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie', disabled: true },
  { value: 'delta', label: 'Delta' },
  { value: 'echo', label: 'Echo' },
];

const LONG: UiListbox.Option[] = Array.from({ length: 40 }, (_, index) => ({
  value: `item-${index + 1}`,
  label: `Item ${index + 1}`,
}));

/**
 * A single-selection list with icons, a description, a disabled row and the indicator; a plain list; and a long list
 * scrolling in a `Panel` under a filtering toolbar (the current Default, WithDisabled, Plain and WithToolbar).
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [selected, setSelected] = useState<string | undefined>('alpha');
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['bravo']));
  const filtered = LONG.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <Listbox.Root
        items={ITEMS}
        value={selected}
        onValueChange={setSelected}
        onDeselect={() => setSelected(undefined)}
      >
        <Listbox.Label>Letters</Listbox.Label>
        <Listbox.Viewport>
          <Listbox.Content>
            {ITEMS.map((item) => (
              <Listbox.Item key={item.value} id={item.value} data-testid={`letter-${item.value}-${size}`}>
                <Listbox.ItemIcon icon='ph--circle--regular' />
                <Listbox.ItemText />
                {item.description && <Listbox.ItemDescription />}
                <Listbox.ItemIndicator />
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
      <Typography.Text data-testid={`selected-${size}`}>{selected ?? 'None'}</Typography.Text>
      <Listbox.Root items={ITEMS}>
        <Listbox.Viewport>
          <Listbox.Content aria-label='Plain'>
            {ITEMS.map((item) => (
              <Listbox.Item key={item.value} id={item.value} />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
      <UiListbox.Root items={ITEMS} {...listboxSelection({ mode: 'multi', value: picked, onValueChange: setPicked })}>
        <UiListbox.Viewport>
          <UiListbox.Content aria-label='Picked'>
            {ITEMS.map((item) => (
              <UiListbox.Item key={item.value} item={item}>
                <UiListbox.ItemText />
                <UiListbox.ItemIndicator />
              </UiListbox.Item>
            ))}
          </UiListbox.Content>
        </UiListbox.Viewport>
      </UiListbox.Root>
      <Typography.Text data-testid={`picked-${size}`}>{Array.from(picked).join(' ')}</Typography.Text>
      <div className='h-48'>
        <Panel.Root>
          <Panel.Header>
            <Toolbar.Root>
              <Input.Root
                aria-label='Filter'
                placeholder='Filter...'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body>
            <Listbox.Root items={filtered} value={undefined} onValueChange={() => {}}>
              <Listbox.Viewport>
                <Listbox.Content aria-label='Long'>
                  {filtered.map((item) => (
                    <Listbox.Item key={item.value} id={item.value} />
                  ))}
                </Listbox.Content>
              </Listbox.Viewport>
              <Listbox.Empty>No matches</Listbox.Empty>
            </Listbox.Root>
          </Panel.Body>
        </Panel.Root>
      </div>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-list/Listbox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Selection is opt-in and single, keyed by the item id: the selected row reports `aria-selected`, clicking another
 * selects it, clicking it again deselects (`onDeselect`), and the disabled row is skipped. Without a value model the
 * list selects nothing; `listboxSelection` adapts a set of ids to multiple selection. The filter narrows the long list
 * inside the Panel, down to its Empty part.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const letters = canvas.getByRole('listbox', { name: 'Letters' });
    await expect(within(letters).getByRole('option', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'true');
    await expect(within(letters).getByRole('option', { name: /Charlie/ })).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(within(letters).getByRole('option', { name: /Delta/ }));
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('delta'));
    await expect(within(letters).getByRole('option', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(within(letters).getByRole('option', { name: /Delta/ }));
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('None'));

    letters.focus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowDown}{Enter}');
    await waitFor(() => expect(canvas.getByTestId('selected-md')).toHaveTextContent('delta'));

    // Without a value model the list selects nothing but keeps the listbox machine.
    const plain = canvas.getByRole('listbox', { name: 'Plain' });
    await expect(within(plain).getAllByRole('option')).toHaveLength(ITEMS.length);
    await userEvent.click(within(plain).getByRole('option', { name: 'Bravo' }));
    await expect(within(plain).queryByRole('option', { selected: true })).toBeNull();

    // `listboxSelection` adapts a set of ids to Ark's multiple selection.
    const picked = canvas.getByRole('listbox', { name: 'Picked' });
    await expect(picked).toHaveAttribute('aria-multiselectable', 'true');
    await expect(within(picked).getByRole('option', { name: 'Bravo' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(picked).getByRole('option', { name: 'Delta' }));
    await waitFor(() => expect(canvas.getByTestId('picked-md')).toHaveTextContent('bravo delta'));

    const long = canvas.getByRole('listbox', { name: 'Long' });
    await expect(within(long).getAllByRole('option')).toHaveLength(LONG.length);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Filter' }), 'Item 1');
    await waitFor(() => expect(within(long).getAllByRole('option')).toHaveLength(11));
    await expect(canvas.queryByText('No matches')).toBeNull();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Filter' }), 'x');
    await waitFor(() => expect(canvas.getByText('No matches')).toBeVisible());
  },
};

const SWATCHES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
  'slate',
];

const SwatchTile = ({ value, controller }: { value: string; controller: ReorderListController<string> }) => {
  const { rowRef, handleRef } = useReorderItem(controller, value);
  // The whole tile is the drag handle.
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      rowRef(node);
      handleRef(node);
    },
    [rowRef, handleRef],
  );
  return (
    <Listbox.Item ref={ref} id={value} data-testid={`tile-${value}`}>
      <div className='aspect-video rounded-sm' style={{ background: `var(--color-${value}-500)` }} />
      <Listbox.ItemText />
    </Listbox.Item>
  );
};

/**
 * A grid of cards: `tiles` columns in a `Viewport` that scrolls vertically, a neutral outline on hover and the focus
 * outline on the selected tile, and tiles dragged to reorder them (`useReorderList` with `axis='horizontal'`).
 */
const TilesStory = ({ tileWidth }: { tileWidth?: number }) => {
  const [order, setOrder] = useState(SWATCHES);
  const [large, setLarge] = useState(false);
  const [selected, setSelected] = useState<string | undefined>('green');
  const { controller } = useReorderList<string>({
    items: order,
    getId: (value) => value,
    axis: 'horizontal',
    dragPreview: 'clone',
    onMove: (from, to) =>
      setOrder((current) => {
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
  });
  const items = order.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
  return (
    // With `tileWidth` the grid fills the viewport (escaping the meta's fixed-width frame), so resizing the window reflows it.
    <div
      className={tileWidth ? 'fixed inset-0 flex flex-col dx-base-surface' : 'flex flex-col h-80 [grid-column:full]'}
    >
      {tileWidth && (
        <label className='flex items-center gap-2 p-2'>
          <input type='checkbox' checked={large} onChange={(event) => setLarge(event.target.checked)} />
          Large tiles
        </label>
      )}
      <Listbox.Root
        items={items}
        {...(tileWidth
          ? { tileWidth: { min: tileWidth * (large ? 2 : 1), max: tileWidth * (large ? 3 : 1.5) } }
          : { tiles: 4 })}
        value={selected}
        onValueChange={setSelected}
        classNames='dx-grow'
      >
        <Listbox.Viewport>
          <Listbox.Content aria-label='Swatches'>
            {order.map((value) => (
              <SwatchTile key={value} value={value} controller={controller} />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
    </div>
  );
};

/** Tiles wrap into rows that scroll, the selected tile is outlined, and arrow keys move across and down the grid. */
export const Tiles: Story = {
  render: () => <TilesStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const listbox = canvas.getByRole('listbox', { name: 'Swatches' });
    await expect(canvas.getByRole('option', { name: 'Green' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight));
    const red = canvas.getByTestId('tile-red');
    await expect(red).toHaveAttribute('draggable', 'true');
    // A tile is its own drag handle, so the list must not cancel the press that would start its native drag.
    await expect(red).toHaveAttribute('data-drag-row');
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    red.dispatchEvent(press);
    await expect(press.defaultPrevented).toBe(false);

    listbox.focus();
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowDown}{Enter}');
    await waitFor(() => expect(canvas.getByRole('option', { name: 'Green' })).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(canvas.getByRole('option', { name: 'Blue' })).toHaveAttribute('aria-selected', 'true'));
  },
};

/** Tiles at least `tileWidth` wide, as many columns as fit: resize the window and they reflow without stretching. */
export const ResponsiveTiles: Story = {
  render: () => <TilesStory tileWidth={120} />,
};
