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
import { byTestId, centreY, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

/** Label text (one step below the body) per size, in px. */
const LABEL_FONT: Record<Size, number> = { xs: 12, sm: 12, md: 14, lg: 16, xl: 18 };

const VALENCES: Next.TagHue[] = ['neutral', 'info', 'success', 'warning', 'error'];

/** A row of tags centred in a block row, then every valence and hue. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Container layout='row' data-testid={`row-${size}`}>
      <Next.Group>
        <Next.Tag hue='blue' data-testid={`tag-${size}`}>
          Release
        </Next.Tag>
        <Next.Tag hue='amber'>Draft</Next.Tag>
      </Next.Group>
    </Next.Container>
    <Next.Group>
      {[...VALENCES, ...hues].map((hue) => (
        <Next.Tag key={hue} hue={hue} data-testid={`hue-${hue}-${size}`}>
          {hue}
        </Next.Tag>
      ))}
    </Next.Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Tag',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[48rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A tag is one inset shorter than a control on each side, centred in its row, in the size's label text; each hue maps
 * to ui-theme's surface/fg tokens, and valences share the current Tag's hues (error is rose).
 */
export const Test: Story = {
  args: { allSizes: true },
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

    const canvas = within(sizeRow(canvasElement, 'md'));
    const background = (hue: string) => getComputedStyle(byTestId(canvasElement, `hue-${hue}-md`)).backgroundColor;
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
