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
  /** `variants`: every variant at md, then primary at every size; `icon`/`iconVariants`: the same with icon buttons. */
  kind?: 'text' | 'variants' | 'icon' | 'iconVariants';
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

const IconVariantsStory = () => (
  <div className='nx-scope flex flex-col gap-2' data-size='md'>
    <Next.Toolbar>
      {VARIANTS.map(({ name, variant, valence }) => (
        <Next.Button
          key={name}
          icon='ph--star--regular'
          label={name}
          iconOnly
          variant={variant}
          valence={valence}
          data-testid={`variant-${name}`}
        />
      ))}
    </Next.Toolbar>
    <Next.Toolbar>
      {VARIANTS.map(({ name, variant, valence }) => (
        <Next.Button
          key={name}
          icon='ph--star--regular'
          label={name}

          variant={variant}
          valence={valence}
        />
      ))}
    </Next.Toolbar>
    <div className='flex items-center'>
      {SIZES.map((size) => (
        <div key={size} className='nx-scope flex' data-size={size}>
          <Next.Button icon='ph--star--regular' label={size} iconOnly variant='primary' data-testid={`size-${size}`} />
        </div>
      ))}
    </div>
  </div>
);

/** Each toolbar sits over a row with a rail Block, so the first button's icon can be compared with the rail's. */
const IconStory = () => (
  <div className='nx-scope @container flex flex-col gap-2 w-[28rem]' data-size='md'>
    {SIZES.map((size) => (
      <div key={size} className='flex flex-col border border-separator'>
        <Next.Toolbar size={size} data-testid={`toolbar-${size}`}>
          <Next.Button icon='ph--plus--regular' label={`Add ${size}`} iconOnly data-testid={`add-${size}`} />
          <Next.Button icon='ph--minus--regular' label={`Remove ${size}`} iconOnly data-testid={`remove-${size}`} />
          <Next.Button icon='ph--trash--regular' label={`Delete ${size}`} iconOnly disabled />
          <Next.Button
            icon='ph--share--regular'
            label={`Share ${size}`}

            data-testid={`share-${size}`}
          />
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

const TextStory = ({ disabled }: StoryArgs) => (
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

const DefaultStory = ({ kind = 'text', ...args }: StoryArgs) => {
  switch (kind) {
    case 'variants':
      return <VariantsStory />;
    case 'icon':
      return <IconStory />;
    case 'iconVariants':
      return <IconVariantsStory />;
    default:
      return <TextStory {...args} />;
  }
};

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
  args: { kind: 'variants' },
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

/**
 * Icon buttons are control-sized squares inset in a block-sized cell (decision 12), with the same icon scale as a rail
 * Block and the first button's icon at the rail icon's x.
 */
export const IconSizes: Story = {
  args: { kind: 'icon' },
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
export const IconRoles: Story = {
  args: { kind: 'icon' },
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
  args: { kind: 'icon' },
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
  args: { kind: 'icon' },
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

/** Every variant applies to an icon-only button too, each distinct from the default and with a hover state. */
export const IconVariants: Story = {
  args: { kind: 'iconVariants' },
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

/**
 * `iconOnly={false}` shows the label after the icon, spaced by the gap and padded like a Button, at the icon-only
 * button's height; the text names it, so it has no `aria-label` and no Tooltip.
 */
export const Labelled: Story = {
  args: { kind: 'icon' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of SIZES) {
      const share = byTestId(canvasElement, `share-${size}`);
      await expect(share).toHaveTextContent(`Share ${size}`);
      await expect(share).toBeVisible();
      await expect(share).not.toHaveAttribute('aria-label');
      await expect(canvas.getByRole('button', { name: `Share ${size}` })).toBe(share);
      const rect = share.getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(
        byTestId(canvasElement, `add-${size}`).getBoundingClientRect().height,
        0,
      );
      await expect(rect.width, size).toBeGreaterThan(rect.height);
      const style = getComputedStyle(share);
      const icon = share.querySelector('svg')?.getBoundingClientRect();
      const gap = parseFloat(style.columnGap);
      await expect(gap, `${size} gap`).toBeCloseTo(parseFloat(style.paddingLeft), 0);
      await expect(icon?.left, `${size} icon`).toBeCloseTo(rect.left + parseFloat(style.paddingLeft), 0);
    }

    const share = byTestId(canvasElement, 'share-md');
    const watch = expectNoTooltip(canvasElement);
    await realHover(share);
    await watch;
  },
};
