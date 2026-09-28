//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';
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
  sizeRow,
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

type StoryArgs = SizeArgs & {
  variant?: Next.ButtonVariant;
  valence?: Next.ButtonValence;
  /** Also show every variant, icon-only then as text. */
  variants?: boolean;
};

/**
 * A toolbar of icon-only, text, disabled, leading-icon and trailing-icon buttons over a row with a rail Block, so the
 * first button's icon can be compared with the rail's; `variant`/`valence` apply to the default buttons.
 */
const DefaultStory = ({ size, variant, valence, variants }: StoryArgs) => (
  <>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Button
        icon='ph--plus--regular'
        label={`Add ${size}`}
        iconOnly
        variant={variant}
        valence={valence}
        data-testid={`add-${size}`}
      />
      <Next.Button
        icon='ph--minus--regular'
        label={`Remove ${size}`}
        iconOnly
        variant={variant}
        valence={valence}
        data-testid={`remove-${size}`}
      />
      <Next.Button icon='ph--trash--regular' label={`Delete ${size}`} iconOnly disabled />
      <Next.Button variant={variant} valence={valence} data-testid={`button-${size}`}>
        Save
      </Next.Button>
      <Next.Button variant='primary' data-testid={`primary-${size}`}>
        Publish
      </Next.Button>
      <Next.Button disabled data-testid={`disabled-${size}`}>
        Archive
      </Next.Button>
      <Next.Button icon='ph--share--regular' label={`Share ${size}`} data-testid={`share-${size}`} />
      <Next.Button iconEnd='ph--caret-down--regular' label={`More ${size}`} data-testid={`more-${size}`} />
    </Next.Toolbar.Root>
    <Next.Container gutter='rail' layout='row'>
      <Next.Block rail='start' data-testid={`rail-${size}`}>
        <Next.Icon icon='ph--circle--regular' />
      </Next.Block>
      <Next.Typography>Row {size}</Next.Typography>
    </Next.Container>
    {variants && (
      <Next.Group>
        {VARIANTS.map(({ name, variant, valence }) => (
          <Next.Group key={name}>
            <Next.Button
              icon='ph--star--regular'
              label={name}
              iconOnly
              variant={variant}
              valence={valence}
              data-testid={`icon-variant-${name}-${size}`}
            />
            <Next.Button variant={variant} valence={valence} data-testid={`variant-${name}-${size}`}>
              {name}
            </Next.Button>
          </Next.Group>
        ))}
      </Next.Group>
    )}
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/button',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[48rem]' }), withTheme()],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS.map(({ variant }) => variant) },
    valence: { control: 'select', options: ['neutral', 'info', 'success', 'warning', 'error'] },
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Buttons are control-tall and centred in their block at every size (decision 12); icon-only buttons are control
 * squares inset in a block-sized cell (follow-up 19), with the rail Block's icon scale and the first icon at the rail
 * icon's x. A button is `type=button`; an icon-only button is named by its label (no native `title`, which would
 * double the Tooltip) and shows it in a Tooltip on keyboard focus (following the toolbar's roving focus) and on hover,
 * but not on click. A labelled icon is spaced by the gap and padded like text, at the icon-only height, with no Tooltip.
 * Disabled buttons drop out of the roving focus and ignore clicks. Every variant repaints the default: filled variants
 * change background and text, ghost and outline drop the fill (outline keeps a border), each valence has its own
 * colour, and every variant has a hover state. The story ends with a tooltip open.
 */
export const Test: Story = {
  args: { variants: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Geometry.
    for (const size of SIZES) {
      const { block, inset, icon } = GEOMETRY[size];
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(block, 0);
      for (const part of ['button', 'primary', 'share', 'more']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
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

      // A leading icon then the label, spaced by the gap and padded like a text button; a trailing icon mirrors it.
      const share = byTestId(canvasElement, `share-${size}`);
      await expect(share).toHaveTextContent(`Share ${size}`);
      await expect(share).toBeVisible();
      await expect(share).not.toHaveAttribute('aria-label');
      await expect(canvas.getByRole('button', { name: `Share ${size}` })).toBe(share);
      const shareRect = share.getBoundingClientRect();
      await expect(shareRect.height, size).toBeCloseTo(add.height, 0);
      await expect(shareRect.width, size).toBeGreaterThan(shareRect.height);
      const shareStyle = getComputedStyle(share);
      const shareIcon = share.querySelector('svg')?.getBoundingClientRect();
      await expect(parseFloat(shareStyle.columnGap), `${size} gap`).toBeCloseTo(parseFloat(shareStyle.paddingLeft), 0);
      await expect(shareIcon?.left, `${size} icon`).toBeCloseTo(shareRect.left + parseFloat(shareStyle.paddingLeft), 0);
      const more = byTestId(canvasElement, `more-${size}`);
      const moreRect = more.getBoundingClientRect();
      const moreIcon = more.querySelector('svg')?.getBoundingClientRect();
      await expect(moreIcon?.right, `${size} end icon`).toBeCloseTo(
        moreRect.right - parseFloat(getComputedStyle(more).paddingRight),
        0,
      );
    }

    // Roles.
    const md = within(sizeRow(canvasElement, 'md'));
    const save = md.getAllByRole('button', { name: 'Save' })[0];
    await expect(save).toHaveAttribute('type', 'button');
    await expect(save).toHaveAttribute('data-variant', 'default');
    const publish = md.getAllByRole('button', { name: 'Publish' })[0];
    await expect(publish).toHaveAttribute('data-variant', 'primary');
    await expect(getComputedStyle(publish).backgroundColor).not.toBe(getComputedStyle(save).backgroundColor);
    const addMd = md.getByRole('button', { name: 'Add md' });
    await expect(addMd).toBe(byTestId(canvasElement, 'add-md'));
    await expect(addMd).not.toHaveAttribute('title');
    await expect(addMd).toHaveAttribute('type', 'button');
    await expect(md.getByRole('button', { name: 'Delete md' })).toBeDisabled();
    await expectDecorativeIconsHidden(canvasElement);
    await expectScoped(canvasElement);

    // Disabled.
    const archive = byTestId(canvasElement, 'disabled-md');
    await expect(archive).toBeDisabled();
    await userEvent.click(archive);
    await expect(archive).not.toHaveFocus();

    // The label shows on keyboard focus, follows the toolbar's roving focus, and shows on hover.
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    const addXs = byTestId(canvasElement, 'add-xs');
    await expect(addXs).toHaveFocus();
    await expectTooltip(addXs, 'Add xs');
    await expect(addXs).toHaveAccessibleDescription('Add xs');

    await userEvent.keyboard('{ArrowRight}');
    const removeXs = byTestId(canvasElement, 'remove-xs');
    await expect(removeXs).toHaveFocus();
    await expectTooltip(removeXs, 'Remove xs');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(body.getAllByRole('tooltip')).toHaveLength(1);

    const addLg = byTestId(canvasElement, 'add-lg');
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add lg');
    await expect(addLg).not.toHaveAttribute('title');
    await userEvent.unhover(addLg);
    removeXs.blur();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // A click neither opens nor flashes the label Tooltip; keyboard focus still shows it.
    const add = byTestId(canvasElement, 'add-md');
    const clickWatch = expectNoTooltip(canvasElement);
    await userEvent.click(add);
    await clickWatch;
    await expect(add).toHaveFocus();
    await userEvent.tab();
    const next = canvasElement.ownerDocument.activeElement;
    if (!(next instanceof HTMLElement)) {
      throw new Error('nothing focused');
    }
    await expectTooltip(next, next.getAttribute('aria-label') ?? '');
    next.blur();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // A labelled icon has no Tooltip.
    const hoverWatch = expectNoTooltip(canvasElement);
    await realHover(byTestId(canvasElement, 'share-md'));
    await hoverWatch;

    // Variants.
    const style = (name: string) => getComputedStyle(byTestId(canvasElement, `variant-${name}-md`));
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
    const iconBase = getComputedStyle(byTestId(canvasElement, 'icon-variant-default-md')).backgroundColor;
    for (const { name } of VARIANTS.slice(1)) {
      const background = getComputedStyle(byTestId(canvasElement, `icon-variant-${name}-md`)).backgroundColor;
      await expect(background, `icon ${name} background`).not.toBe(iconBase);
    }
    for (const { name } of VARIANTS) {
      for (const testId of [`variant-${name}-md`, `icon-variant-${name}-md`]) {
        const button = byTestId(canvasElement, testId);
        const rest = getComputedStyle(button).backgroundColor;
        await realHover(button);
        await expect(getComputedStyle(button).backgroundColor, `${testId} hover`).not.toBe(rest);
      }
    }

    // Rest on an open tooltip.
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add lg');
  },
};
