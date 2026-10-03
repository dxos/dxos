//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & Pick<Next.FocusGroupProps, 'orientation' | 'border'>;

const ITEMS = ['Inbox', 'Drafts', 'Sent', 'Archive'];

/** A member that colours its group's ring, as a drop target does while dragged over. */
const Reporter = () => {
  const { setFocus } = Next.useFocus();
  return (
    <Next.Group>
      <Next.Button label='Active' onClick={() => setFocus?.('active')} />
      <Next.Button label='Error' onClick={() => setFocus?.('error')} />
      <Next.Button label='Clear' onClick={() => setFocus?.(undefined)} />
    </Next.Group>
  );
};

const DefaultStory = ({ orientation, border }: StoryArgs) => {
  const [current, setCurrent] = useState<string>();
  return (
    <>
      <Next.Focus.Group
        orientation={orientation}
        border={border}
        classNames={orientation === 'horizontal' ? 'flex' : 'flex flex-col'}
        data-testid='group'
      >
        {ITEMS.map((item) => (
          <Next.Focus.Item
            key={item}
            current={current === item}
            onCurrentChange={() => setCurrent(item)}
            classNames='p-2 aria-current:bg-current-surface'
            data-testid={`item-${item}`}
          >
            {item}
          </Next.Focus.Item>
        ))}
        <Reporter />
      </Next.Focus.Group>
      <Next.Typography data-testid='current'>Current: {current ?? 'none'}</Next.Typography>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Focus',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', orientation: 'vertical', border: true },
  argTypes: { ...SIZE_ARG_TYPES, orientation: { control: 'radio', options: ['vertical', 'horizontal'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The group is one tab stop with arrow navigation; Enter makes an item current; members colour the ring. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const group = canvas.getByTestId('group');
    const ring = (element: HTMLElement) => getComputedStyle(element, '::after').boxShadow;

    // `border` shows a 1px edge at rest.
    await expect(ring(group)).toContain('1px');

    // Tab lands on the group and shows the ring.
    await userEvent.tab();
    await expect(group).toHaveFocus();
    await expect(ring(group)).toContain('2px');

    // Arrow keys move between items, which take the ring in turn.
    await userEvent.keyboard('{Enter}');
    const inbox = canvas.getByTestId('item-Inbox');
    await waitFor(() => expect(inbox).toHaveFocus());
    await expect(ring(inbox)).toContain('2px');
    await userEvent.keyboard('{ArrowDown}');
    const drafts = canvas.getByTestId('item-Drafts');
    await waitFor(() => expect(drafts).toHaveFocus());

    // Enter makes the focused item current.
    await userEvent.keyboard('{Enter}');
    await expect(drafts).toHaveAttribute('aria-current', 'true');
    await expect(inbox).not.toHaveAttribute('aria-current');
    await expect(canvas.getByTestId('current')).toHaveTextContent('Current: Drafts');

    // A click also makes an item current.
    await userEvent.click(canvas.getByTestId('item-Sent'));
    await expect(canvas.getByTestId('item-Sent')).toHaveAttribute('aria-current', 'true');

    // A member's reported state colours the group's ring.
    await userEvent.click(canvas.getByRole('button', { name: 'Error' }));
    await expect(group).toHaveAttribute('data-focus-state', 'error');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(group).not.toHaveAttribute('data-focus-state');
  },
};
