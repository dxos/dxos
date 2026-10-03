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

type StoryArgs = SizeArgs & Pick<Next.AccordionRootProps, 'border' | 'multiple'>;

const ITEMS = [
  { value: 'search', icon: 'ph--magnifying-glass--regular', label: 'Search the web', detail: '12 results for "zag"' },
  { value: 'read', icon: 'ph--file-text--regular', label: 'Read a document', detail: 'Read DESIGN.md (673 lines)' },
  { value: 'think', icon: 'ph--brain--regular', label: 'Thought for 2s' },
];

const DefaultStory = ({ border, multiple }: StoryArgs) => {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <>
      <Next.Accordion.Root border={border} multiple={multiple} value={open} onValueChange={setOpen}>
        {ITEMS.map(({ value, icon, label, detail }) => (
          <Next.Accordion.Item key={value} value={value} disabled={!detail} data-testid={`item-${value}`}>
            <Next.Accordion.ItemTrigger icon={icon}>{label}</Next.Accordion.ItemTrigger>
            {detail && (
              <Next.Accordion.ItemContent>
                <Next.Typography>{detail}</Next.Typography>
              </Next.Accordion.ItemContent>
            )}
          </Next.Accordion.Item>
        ))}
      </Next.Accordion.Root>
      <Next.Typography data-testid='open'>Open: {open.join(', ') || 'none'}</Next.Typography>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Accordion',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', border: true, multiple: true },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Triggers toggle their items by pointer and keyboard, several at once; a disabled item has no caret. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const search = canvas.getByRole('button', { name: 'Search the web' });
    const read = canvas.getByRole('button', { name: 'Read a document' });
    const think = canvas.getByRole('button', { name: 'Thought for 2s' });

    // Triggers are block rows.
    const block = parseFloat(getComputedStyle(search).getPropertyValue('--nx-block-size')) * 16;
    await expect(search.getBoundingClientRect().height).toBeCloseTo(block, 0);
    await expect(search).toHaveAttribute('aria-expanded', 'false');

    // A disabled item has no caret and does not toggle.
    await expect(think).toBeDisabled();
    await expect(think.querySelector('[data-part="item-indicator"]')).toBeNull();
    await expect(search.querySelector('[data-part="item-indicator"]')).not.toBeNull();

    // Click opens; the caret turns.
    await userEvent.click(search);
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByText('12 results for "zag"')).toBeVisible());
    const indicator = search.querySelector('[data-part="item-indicator"]');
    await waitFor(() => expect(indicator ? getComputedStyle(indicator).transform : '').not.toBe('none'));

    // Several open at once; the value reports both.
    read.focus();
    await userEvent.keyboard('{Enter}');
    await expect(read).toHaveAttribute('aria-expanded', 'true');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('open')).toHaveTextContent('Open: search, read');

    // Arrow keys move between triggers (Ark's APG keymap).
    await userEvent.keyboard('{ArrowUp}');
    await expect(search).toHaveFocus();

    // The bordered frame is rounded and its items are divided.
    const root = search.closest<HTMLElement>('[data-scope="accordion"][data-part="root"]');
    await expect(root ? parseFloat(getComputedStyle(root).borderTopWidth) : 0).toBe(1);
    await expect(parseFloat(getComputedStyle(canvas.getByTestId('item-read')).borderTopWidth)).toBe(1);
  },
};
