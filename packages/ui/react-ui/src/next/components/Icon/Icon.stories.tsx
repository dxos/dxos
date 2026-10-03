//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, expectDecorativeIconsHidden, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const VALENCES: Next.IconValence[] = ['neutral', 'info', 'success', 'warning', 'error'];

const HUES: Next.IconHue[] = ['red', 'orange', 'amber', 'green', 'teal', 'sky', 'blue', 'violet', 'pink'];

/**
 * An icon in each rail of a row, then one toolbar per colouring: valences (semantic text colours), palette hues, and
 * a valence over a hue (the valence wins).
 */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Container gutter='rail' layout='row'>
      <Next.Block rail='start' data-testid={`rail-${size}`}>
        <Next.Icon icon='ph--user--regular' />
      </Next.Block>
      <Next.Typography>Icon</Next.Typography>
      <Next.Block rail='end'>
        <Next.Icon icon='ph--x--regular' label='Clear' />
      </Next.Block>
    </Next.Container>
    <Next.Toolbar.Root aria-label='Valence' data-testid={`valence-${size}`}>
      <Next.Toolbar.Text>Valence</Next.Toolbar.Text>
      {VALENCES.map((valence) => (
        <Next.Block key={valence}>
          <Next.Icon icon='ph--circle--fill' valence={valence} data-testid={`valence-${valence}-${size}`} />
        </Next.Block>
      ))}
    </Next.Toolbar.Root>
    <Next.Toolbar.Root aria-label='Hue' data-testid={`hue-${size}`}>
      <Next.Toolbar.Text>Hue</Next.Toolbar.Text>
      {HUES.map((hue) => (
        <Next.Block key={hue}>
          <Next.Icon icon='ph--tag--regular' hue={hue} data-testid={`hue-${hue}-${size}`} />
        </Next.Block>
      ))}
    </Next.Toolbar.Root>
    <Next.Toolbar.Root aria-label='Valence over hue'>
      <Next.Toolbar.Text>Valence over hue</Next.Toolbar.Text>
      <Next.Block>
        <Next.Icon icon='ph--warning--regular' hue='blue' valence='error' data-testid={`both-${size}`} />
      </Next.Block>
      <Next.Block>
        <Next.Icon icon='ph--warning--regular' valence='error' data-testid={`error-${size}`} />
      </Next.Block>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root aria-label='Tone, spin and size'>
      <Next.Toolbar.Text>Tone, spin, size</Next.Toolbar.Text>
      <Next.Block>
        <Next.Icon icon='ph--note--regular' tone='description' data-testid={`tone-description-${size}`} />
      </Next.Block>
      <Next.Block>
        <Next.Icon icon='ph--note--regular' tone='subdued' data-testid={`tone-subdued-${size}`} />
      </Next.Block>
      <Next.Block>
        <Next.Icon icon='ph--spinner-gap--regular' spin data-testid={`spin-${size}`} />
      </Next.Block>
      <Next.Block>
        <Next.Icon icon='ph--star--regular' size='xs' data-testid={`small-${size}`} />
      </Next.Block>
    </Next.Toolbar.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Icon',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * One icon scale per size (decision 2): the same size in a rail Block as in a control. A labelled icon is an `img`;
 * an unlabelled one is hidden from assistive tech (decision 9). `tone` lowers emphasis, `spin` animates (every spinner in one phase), and `size`
 * takes another size's icon scale.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const icon = byTestId(canvasElement, `rail-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(icon?.width, size).toBeCloseTo(GEOMETRY[size].icon, 0);
      await expect(icon?.height, size).toBeCloseTo(GEOMETRY[size].icon, 0);
    }

    // Each valence and hue colours its glyph distinctly, and a valence wins over a hue.
    const color = (testId: string) => getComputedStyle(byTestId(canvasElement, testId)).color;
    const plain = getComputedStyle(within(sizeRow(canvasElement, 'md')).getByRole('img', { name: 'Clear' })).color;
    for (const group of [
      VALENCES.filter((valence) => valence !== 'neutral').map((v) => `valence-${v}-md`),
      HUES.map((hue) => `hue-${hue}-md`),
    ]) {
      const colors = group.map(color);
      await expect(new Set(colors).size, group.join(',')).toBe(colors.length);
      for (const value of colors) {
        await expect(value).not.toBe(plain);
      }
    }
    await expect(color('both-md')).toBe(color('error-md'));

    await expect(color('tone-description-md')).not.toBe(plain);
    await expect(color('tone-subdued-md')).not.toBe(plain);
    await expect(color('tone-subdued-md')).not.toBe(color('tone-description-md'));
    await expect(getComputedStyle(byTestId(canvasElement, 'spin-md')).animationName).toBe('nx-spin');
    // Spinners share a phase: each starts at the wall clock's offset into the turn.
    await expect(parseFloat(byTestId(canvasElement, 'spin-md').style.animationDelay)).toBeLessThanOrEqual(0);
    for (const size of SIZES) {
      await expect(byTestId(canvasElement, `small-${size}`).getBoundingClientRect().width, size).toBeCloseTo(
        GEOMETRY.xs.icon,
        0,
      );
    }

    const canvas = within(canvasElement);
    await expect(within(sizeRow(canvasElement, 'md')).getByRole('img', { name: 'Clear' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('img')).toHaveLength(SIZES.length);
    await expectDecorativeIconsHidden(canvasElement);
    await expectScoped(canvasElement);
  },
};
