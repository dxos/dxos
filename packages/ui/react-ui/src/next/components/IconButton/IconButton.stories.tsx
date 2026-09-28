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
import {
  GEOMETRY,
  byTestId,
  centreY,
  controlSize,
  expectDecorativeIconsHidden,
  expectNoTooltip,
  expectScoped,
  expectTooltip,
  realHover,
} from '../../testing.ts';

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
  /** Show every variant at md, then one at every size. */
  variants?: boolean;
};

const VariantsStory = () => (
  <div className='nx-scope flex flex-col gap-2' data-size='md'>
    <Next.Toolbar>
      {VARIANTS.map(({ name, variant, valence }) => (
        <Next.IconButton
          key={name}
          icon='ph--star--regular'
          label={name}
          variant={variant}
          valence={valence}
          data-testid={`variant-${name}`}
        />
      ))}
    </Next.Toolbar>
    <div className='flex items-center'>
      {SIZES.map((size) => (
        <div key={size} className='nx-scope flex' data-size={size}>
          <Next.IconButton icon='ph--star--regular' label={size} variant='primary' data-testid={`size-${size}`} />
        </div>
      ))}
    </div>
  </div>
);

/** Each toolbar sits over a row with a rail Block, so the first button's icon can be compared with the rail's. */
const DefaultStory = ({ variants }: StoryArgs) =>
  variants ? (
    <VariantsStory />
  ) : (
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
  title: 'ui/react-ui-core/next/components/icon-button',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

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

/** The required label names the button (no native `title`, which would double the Tooltip); its icon is decorative. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const add = canvas.getByRole('button', { name: 'Add md' });
    await expect(add).toBe(byTestId(canvasElement, 'add-md'));
    await expect(add).not.toHaveAttribute('title');
    await expect(add).toHaveAttribute('type', 'button');
    await expect(canvas.getByRole('button', { name: 'Delete md' })).toBeDisabled();
    await expectDecorativeIconsHidden(canvasElement);
    await expectScoped(canvasElement);
  },
};

/**
 * The label shows in a Tooltip on keyboard focus, follows the toolbar's roving focus, and shows on hover; the story
 * ends with a tooltip open.
 */
export const LabelTooltip: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.tab();
    const addXs = byTestId(canvasElement, 'add-xs');
    await expect(addXs).toHaveFocus();
    await expectTooltip(addXs, 'Add xs');
    await expect(addXs).toHaveAccessibleDescription('Add xs');

    // Arrow keys move the toolbar's roving focus; the tooltip follows and stays open.
    await userEvent.keyboard('{ArrowRight}');
    const removeXs = byTestId(canvasElement, 'remove-xs');
    await expect(removeXs).toHaveFocus();
    await expectTooltip(removeXs, 'Remove xs');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(body.getAllByRole('tooltip')).toHaveLength(1);

    // Hover shows another button's label after the open delay.
    const addLg = canvas.getByTestId('add-lg');
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add lg');
    await expect(addLg).not.toHaveAttribute('title');
  },
};

/** A click neither opens nor flashes the label Tooltip; keyboard focus still shows it. The story ends open. */
export const ClickNoTooltip: Story = {
  play: async ({ canvasElement }) => {
    const add = byTestId(canvasElement, 'add-md');
    const watch = expectNoTooltip(canvasElement);
    await userEvent.click(add);
    await watch;
    await expect(add).toHaveFocus();

    await userEvent.tab();
    const next = byTestId(canvasElement, 'add-lg');
    await expect(next).toHaveFocus();
    await expectTooltip(next, 'Add lg');
  },
};

/** Every Button variant applies to an icon button too, each distinct from the default and with a hover state. */
export const Variants: Story = {
  args: { variants: true },
  play: async ({ canvasElement }) => {
    const style = (name: string) => getComputedStyle(byTestId(canvasElement, `variant-${name}`));
    const base = style('default').backgroundColor;
    for (const { name } of VARIANTS.slice(1)) {
      await expect(style(name).backgroundColor, `${name} background`).not.toBe(base);
    }
    for (const size of SIZES) {
      const rect = byTestId(canvasElement, `size-${size}`).getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(controlSize(size), 0);
    }
    for (const { name } of VARIANTS) {
      const button = byTestId(canvasElement, `variant-${name}`);
      const rest = getComputedStyle(button).backgroundColor;
      await realHover(button);
      await expect(getComputedStyle(button).backgroundColor, `${name} hover`).not.toBe(rest);
    }
  },
};
