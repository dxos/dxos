//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped, realHover } from '../../testing.ts';

/** Every variant, with the `valence` variant once bare and once per valence. */
const VARIANTS: { name: string; variant: Next.ButtonVariant; valence?: Next.ButtonValence }[] = [
  { name: 'default', variant: 'default' },
  { name: 'primary', variant: 'primary' },
  { name: 'ghost', variant: 'ghost' },
  { name: 'outline', variant: 'outline' },
  { name: 'destructive', variant: 'destructive' },
  { name: 'valence', variant: 'valence' },
  ...(['neutral', 'info', 'success', 'warning', 'error'] as const).map((valence) => ({
    name: `valence-${valence}`,
    variant: 'valence' as const,
    valence,
  })),
];

type StoryArgs = {
  disabled?: boolean;
  /** Show every variant at md, then primary at every size. */
  variants?: boolean;
};

const VariantsStory = () => (
  <div className='nx-scope flex flex-col gap-2' data-size='md'>
    <div className='flex flex-wrap gap-2'>
      {VARIANTS.map(({ name, variant, valence }) => (
        <Next.Button key={name} variant={variant} valence={valence} data-testid={`variant-${name}`}>
          {name}
        </Next.Button>
      ))}
    </div>
    <div className='flex items-center gap-2'>
      {SIZES.map((size) => (
        <div key={size} className='nx-scope flex' data-size={size}>
          <Next.Button variant='primary' data-testid={`size-${size}`}>
            {size}
          </Next.Button>
        </div>
      ))}
    </div>
  </div>
);

const DefaultStory = ({ disabled, variants }: StoryArgs) =>
  variants ? (
    <VariantsStory />
  ) : (
    <div className='nx-scope flex flex-col w-[20rem]' data-size='md'>
      {SIZES.map((size) => (
        <Next.Toolbar key={size} size={size} data-testid={`toolbar-${size}`}>
          <Next.Button disabled={disabled} data-testid={`button-${size}`}>
            Save
          </Next.Button>
          <Next.Button variant='primary' disabled={disabled} data-testid={`primary-${size}`}>
            Publish
          </Next.Button>
        </Next.Toolbar>
      ))}
    </div>
  );

const meta = {
  title: 'ui/react-ui-core/next/components/button',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Buttons are control-tall and centred in their block at every size (decision 12). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      for (const part of ['button', 'primary']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
    }
  },
};

/** A button is `type=button`, so it never submits an enclosing form; the primary variant is painted with the accent. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const save = canvas.getAllByRole('button', { name: 'Save' })[0];
    await expect(save).toHaveAttribute('type', 'button');
    await expect(save).toHaveAttribute('data-variant', 'default');
    const publish = canvas.getAllByRole('button', { name: 'Publish' })[0];
    await expect(publish).toHaveAttribute('data-variant', 'primary');
    await expect(getComputedStyle(publish).backgroundColor).not.toBe(getComputedStyle(save).backgroundColor);
    await expectScoped(canvasElement);
  },
};

/** Disabled buttons drop out of the toolbar's roving focus and ignore clicks. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const save = byTestId(canvasElement, 'button-md');
    await expect(save).toBeDisabled();
    await userEvent.click(save);
    await expect(save).not.toHaveFocus();
  },
};

/**
 * Every variant repaints the default: filled variants change background and text, ghost and outline drop the fill
 * (outline keeps a border), each valence has its own colour, and every variant has a hover state.
 */
export const Variants: Story = {
  args: { variants: true },
  play: async ({ canvasElement }) => {
    const style = (name: string) => getComputedStyle(byTestId(canvasElement, `variant-${name}`));
    const base = { background: style('default').backgroundColor, color: style('default').color };
    const filled = [
      'primary',
      'destructive',
      'valence',
      ...VARIANTS.filter(({ valence }) => valence).map(({ name }) => name),
    ];
    for (const name of filled) {
      await expect(style(name).backgroundColor, `${name} background`).not.toBe(base.background);
      await expect(style(name).color, `${name} color`).not.toBe(base.color);
    }
    for (const name of ['ghost', 'outline']) {
      await expect(style(name).backgroundColor, `${name} background`).toBe('rgba(0, 0, 0, 0)');
      await expect(style(name).color, `${name} color`).toBe(base.color);
    }
    await expect(style('outline').borderTopWidth).toBe('1px');
    await expect(style('outline').borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    const valences = VARIANTS.filter(({ valence }) => valence).map(({ name }) => style(name).backgroundColor);
    await expect(new Set(valences).size).toBe(valences.length);
    await expect(style('valence').backgroundColor).toBe(style('valence-neutral').backgroundColor);
    for (const size of SIZES) {
      await expect(byTestId(canvasElement, `size-${size}`).getBoundingClientRect().height, size).toBeCloseTo(
        controlSize(size),
        0,
      );
    }

    for (const { name } of VARIANTS) {
      const button = byTestId(canvasElement, `variant-${name}`);
      const rest = getComputedStyle(button).backgroundColor;
      await realHover(button);
      await expect(getComputedStyle(button).backgroundColor, `${name} hover`).not.toBe(rest);
    }
  },
};
