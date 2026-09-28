//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { hues } from '@dxos/ui-types';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import { byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

/** Label text (one step below the body) per size, in px. */
const LABEL_FONT: Record<Size, number> = { xs: 12, sm: 12, md: 14, lg: 16, xl: 18 };

const VALENCES: Next.TagHue[] = ['neutral', 'info', 'success', 'warning', 'error'];

const DefaultStory = () => (
  <div className='nx-scope flex flex-col gap-2 w-[32rem]' data-size='md'>
    {SIZES.map((size) => (
      <Next.Container key={size} size={size} gutter='rail' layout='row' data-testid={`row-${size}`}>
        <Next.Group>
          <Next.Tag hue='blue' data-testid={`tag-${size}`}>
            Release {size}
          </Next.Tag>
          <Next.Tag hue='amber'>Draft</Next.Tag>
        </Next.Group>
      </Next.Container>
    ))}
    <div className='flex flex-wrap gap-1'>
      {[...VALENCES, ...hues].map((hue) => (
        <Next.Tag key={hue} hue={hue} data-testid={`hue-${hue}`}>
          {hue}
        </Next.Tag>
      ))}
    </div>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/tag',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A tag is one inset shorter than a control on each side, centred in its row, in the size's label text. */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const tag = byTestId(canvasElement, `tag-${size}`);
      const row = byTestId(canvasElement, `row-${size}`);
      const inset = parseFloat(getComputedStyle(row).getPropertyValue('--nx-control-inset'));
      const rect = tag.getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size) - 2 * inset, 0);
      await expect(centreY(rect), size).toBeCloseTo(centreY(row.getBoundingClientRect()), 0);
      await expect(parseFloat(getComputedStyle(tag).fontSize), size).toBe(LABEL_FONT[size]);
    }
    await expectScoped(canvasElement);
  },
};

/** Each hue maps to ui-theme's surface/fg tokens; valences share the current Tag's hues (error is rose). */
export const Hues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const background = (hue: string) => getComputedStyle(byTestId(canvasElement, `hue-${hue}`)).backgroundColor;
    const colours = new Set(hues.map(background));
    await expect(colours.size).toBe(hues.length);
    await expect(background('error')).toBe(background('rose'));
    await expect(background('warning')).toBe(background('amber'));
    await expect(background('success')).toBe(background('emerald'));
    await expect(background('info')).toBe(background('cyan'));
    await expect(background('neutral')).not.toBe(background('red'));
    await expect(canvas.getByText('red')).toHaveAttribute('data-hue', 'red');
  },
};
