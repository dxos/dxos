//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const ITEMS: Next.ListboxOption[] = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

/**
 * A plain list whose rows move with their handle's keyboard contract, a drop indicator on the second row's top edge,
 * and a drag preview taking the list's size and level.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems] = useState(ITEMS);
  const [source, setSource] = useState<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const move = (value: string, direction: Next.DragMoveDirection) =>
    setItems((items) => {
      const from = items.findIndex((item) => item.value === value);
      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= items.length) {
        return items;
      }
      const next = [...items];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  return (
    <>
      <Next.Listbox.Root items={items} selectionMode='none'>
        <Next.Listbox.Content aria-label='Order' data-testid={`list-${size}`}>
          {items.map((item, index) => (
            <Next.Listbox.Item
              key={item.value}
              item={item}
              data-testid={`row-${item.value}-${size}`}
              ref={index === 0 ? (element) => setSource(element) : index === 1 ? rowRef : undefined}
            >
              <Next.Listbox.ItemText />
              <Next.DragHandle
                label={`Move ${item.label}`}
                onMove={(direction) => move(item.value, direction)}
                data-testid={`handle-${item.value}-${size}`}
              />
              {index === 1 && <Next.DropIndicator edge='top' />}
            </Next.Listbox.Item>
          ))}
        </Next.Listbox.Content>
      </Next.Listbox.Root>
      <Next.Typography data-testid={`order-${size}`}>{items.map((item) => item.value).join(' ')}</Next.Typography>
      <Next.DragPreview source={source}>
        <span data-testid={`preview-${size}`}>{items[0].label}</span>
      </Next.DragPreview>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/DragHandle',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const announcer = (root: HTMLElement) => root.ownerDocument.getElementById('nx-drag-announcer');

/**
 * At every size the handle is a control-sized ghost square in a block cell, a tab stop described as a drag handle. From
 * the keyboard Alt+ArrowDown moves its row at once; Space grabs (`aria-pressed`), ArrowUp/Down then move, and Escape
 * drops; the handle keeps focus across moves and each step is announced. The drop indicator is a line on its row's top
 * edge spanning the row, and the drag preview reads at the source row's size.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const handle = byTestId(canvasElement, `handle-one-${size}`);
      const rect = handle.getBoundingClientRect();
      await expect(rect.height, `${size} handle`).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, `${size} handle`).toBeCloseTo(controlSize(size), 0);
      await expect(handle).toHaveAttribute('data-variant', 'ghost');
      await expect(handle.tabIndex).toBe(0);

      const row = byTestId(canvasElement, `row-two-${size}`).getBoundingClientRect();
      const indicator = byTestId(canvasElement, `row-two-${size}`).querySelector<HTMLElement>(
        '[data-scope="drop-indicator"]',
      );
      const line = indicator?.getBoundingClientRect();
      await expect(line?.width, `${size} indicator span`).toBeCloseTo(row.width, 0);
      await expect(
        Math.abs((line?.top ?? 0) + (line?.height ?? 0) / 2 - row.top),
        `${size} indicator edge`,
      ).toBeLessThan(0.5);
      await expect(row.height, `${size} indicator takes no track`).toBeCloseTo(GEOMETRY[size].block, 0);

      const preview = byTestId(canvasElement, `preview-${size}`).parentElement;
      await expect(preview).toHaveAttribute('data-size', size);
      await expect(preview?.getBoundingClientRect().height, `${size} preview`).toBeCloseTo(GEOMETRY[size].block, 0);
    }
    await expectScoped(canvasElement);

    const md = within(sizeRow(canvasElement, 'md'));
    const order = byTestId(canvasElement, 'order-md');
    const handle = md.getByRole('button', { name: 'Move One' });
    await expect(handle).toHaveAttribute('aria-roledescription', 'drag handle');
    await expect(handle).toHaveAttribute('aria-pressed', 'false');

    handle.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('two one three'));
    await waitFor(() => expect(handle).toHaveFocus());
    await expect(announcer(canvasElement)).toHaveTextContent('Moved down.');

    await userEvent.keyboard(' ');
    await waitFor(() => expect(handle).toHaveAttribute('aria-pressed', 'true'));
    await expect(announcer(canvasElement)).toHaveTextContent('Grabbed.');
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(order).toHaveTextContent('two three one'));
    await waitFor(() => expect(handle).toHaveFocus());
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await waitFor(() => expect(order).toHaveTextContent('one two three'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(handle).toHaveAttribute('aria-pressed', 'false'));
    await expect(announcer(canvasElement)).toHaveTextContent('Dropped.');

    // Without the grab, arrows are not moves.
    await userEvent.keyboard('{ArrowDown}');
    await expect(order).toHaveTextContent('one two three');
  },
};
