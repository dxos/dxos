//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withSizes, withTheme } from '@dxos/react-ui/testing';

import { AttentionGlyph, type AttentionGlyphPresence, type AttentionGlyphProps } from './AttentionGlyph.tsx';

/** The `withSizes` row holding the story rendered at `size`. */
const sizeRow = (root: HTMLElement, size: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="size-${size}"]`);
  if (!element) {
    throw new Error(`missing size-${size}`);
  }
  return element;
};

type StoryArgs = SizeArgs & Pick<AttentionGlyphProps, 'attended' | 'containsAttended' | 'syncing'>;

const PRESENCES: AttentionGlyphPresence[] = ['none', 'one', 'many'];

const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (
  <div className='flex items-center gap-4'>
    {PRESENCES.map((presence) => (
      <AttentionGlyph
        key={presence}
        presence={presence}
        {...{ attended, containsAttended, syncing }}
        data-testid={presence}
      />
    ))}
    <AttentionGlyph attended presence='one' data-testid='attended' />
    <AttentionGlyph containsAttended data-testid='contains' />
    <AttentionGlyph syncing data-testid='syncing' />
  </div>
);

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-core/components/AttentionGlyph',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[24rem]' }), withTheme()],
  args: { size: 'md', attended: false, containsAttended: false, syncing: false },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The glyph is 3/4 of the icon size; its state colours it, and its mark shows presence or a spinner. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const rest = canvas.getByTestId('none');
    await expect(rest.getBoundingClientRect().width).toBe(12);
    await expect(rest.getBoundingClientRect().height).toBe(12);
    await expect(within(sizeRow(canvasElement, 'xl')).getByTestId('none').getBoundingClientRect().width).toBe(18);
    await expect(rest.childElementCount).toBe(0);

    // Presence marks are decorative; one and many draw different marks.
    const one = canvas.getByTestId('one').querySelector('svg');
    const many = canvas.getByTestId('many').querySelector('svg');
    await expect(one).toHaveAttribute('aria-hidden', 'true');
    await expect(one?.innerHTML).not.toBe(many?.innerHTML);

    // Attended fills with the accent; containing the attended item tints; at rest it is transparent.
    const background = (testId: string) => getComputedStyle(canvas.getByTestId(testId)).backgroundColor;
    await expect(background('none')).toBe('rgba(0, 0, 0, 0)');
    await expect(background('attended')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe(background('attended'));

    // Syncing replaces the mark with a spinner turning every two seconds.
    const spinner = canvas.getByTestId('syncing').querySelector<SVGElement>('[data-scope="icon"]');
    await expect(spinner ? getComputedStyle(spinner).animationDuration : '').toBe('2s');
  },
};
