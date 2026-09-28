//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectDecorativeIconsHidden, expectScoped } from '../../testing.ts';

/** Each toolbar sits over a row with a rail Block, so the first button's icon can be compared with the rail's. */
const DefaultStory = () => (
  <div className='nx-scope @container flex flex-col gap-2 w-[28rem]' data-size='md'>
    {SIZES.map((size) => (
      <div key={size} className='flex flex-col border border-separator'>
        <Next.Toolbar size={size} data-testid={`toolbar-${size}`}>
          <Next.IconButton icon='ph--plus--regular' label={`Add ${size}`} data-testid={`add-${size}`} />
          <Next.IconButton icon='ph--minus--regular' label={`Remove ${size}`} data-testid={`remove-${size}`} />
          <Next.IconButton icon='ph--trash--regular' label={`Delete ${size}`} disabled />
        </Next.Toolbar>
        <Next.Container size={size} gutter='rail' layout='row'>
          <Next.Block rail='start' data-testid={`rail-${size}`}>
            <Next.Icon icon='ph--circle--regular' />
          </Next.Block>
          <Next.Typography>Row {size}</Next.Typography>
        </Next.Container>
      </div>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/icon-button',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Icon buttons are control-sized squares inset in a block-sized cell (decision 12), with the same icon scale as a rail
 * Block and the first button's icon at the rail icon's x.
 */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block, inset, icon } = GEOMETRY[size];
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(block, 0);
      for (const part of ['add', 'remove']) {
        const button = byTestId(canvasElement, `${part}-${size}`);
        const rect = button.getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(rect.width, `${part}-${size} width`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
        const style = getComputedStyle(button);
        for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
          await expect(parseFloat(style[`margin${side}`]), `${part}-${size} margin ${side}`).toBeCloseTo(inset, 0);
        }
        const svg = button.querySelector('svg')?.getBoundingClientRect();
        await expect(svg?.width, `${part}-${size} icon`).toBeCloseTo(icon, 0);
      }

      const add = byTestId(canvasElement, `add-${size}`).getBoundingClientRect();
      await expect(add.left - inset, `add-${size} cell`).toBeCloseTo(toolbar.left, 0);
      const buttonIcon = byTestId(canvasElement, `add-${size}`).querySelector('svg')?.getBoundingClientRect();
      const railIcon = byTestId(canvasElement, `rail-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(buttonIcon?.left, `add-${size} icon x`).toBeCloseTo(railIcon?.left ?? Number.NaN, 0);
    }
  },
};

/** The required label names the button and titles it; its icon is decorative. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const add = canvas.getByRole('button', { name: 'Add md' });
    await expect(add).toBe(byTestId(canvasElement, 'add-md'));
    await expect(add).toHaveAttribute('title', 'Add md');
    await expect(add).toHaveAttribute('type', 'button');
    await expect(canvas.getByRole('button', { name: 'Delete md' })).toBeDisabled();
    await expectDecorativeIconsHidden(canvasElement);
    await expectScoped(canvasElement);
  },
};
