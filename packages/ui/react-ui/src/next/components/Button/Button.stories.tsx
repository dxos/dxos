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
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
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

const HUES: Next.ButtonHue[] = ['neutral', 'red', 'amber', 'emerald', 'sky', 'error'];

type StoryArgs = SizeArgs & {
  /** Also show every variant, icon-only then as text. */
  variants?: boolean;
};

/**
 * A toolbar of icon-only, text, disabled, leading-icon and trailing-icon buttons over a row with a rail Block, so the
 * first button's icon can be compared with the rail's; then caret, compact, tooltip-side and hue buttons.
 */
const DefaultStory = ({ size, variants }: StoryArgs) => (
  <>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
      <Next.Button icon='ph--minus--regular' label='Remove' iconOnly data-testid={`remove-${size}`} />
      <Next.Button icon='ph--trash--regular' label='Delete' iconOnly disabled />
      <Next.Button data-testid={`button-${size}`}>Save</Next.Button>
      <Next.Button variant='primary' data-testid={`primary-${size}`}>
        Publish
      </Next.Button>
      <Next.Button disabled data-testid={`disabled-${size}`}>
        Archive
      </Next.Button>
      <Next.Button icon='ph--share--regular' label='Share' data-testid={`share-${size}`} />
      <Next.Button iconEnd='ph--caret-down--regular' label='More' data-testid={`more-${size}`} />
    </Next.Toolbar.Root>
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
    <Next.Toolbar.Root>
      <Next.Button caretDown data-testid={`caret-${size}`}>
        Format
      </Next.Button>
      <Next.Button icon='ph--text-aa--regular' label='Style' iconOnly caretDown data-testid={`icon-caret-${size}`} />
      <Next.Button compact data-testid={`compact-${size}`}>
        1
      </Next.Button>
      <Next.Button
        icon='ph--caret-left--regular'
        label='Previous'
        iconOnly
        compact
        data-testid={`icon-compact-${size}`}
      />
      <Next.Button icon='ph--info--regular' label='Details' iconOnly tooltipSide='right' data-testid={`side-${size}`} />
      {HUES.map((hue) => (
        <Next.Button key={hue} hue={hue} data-testid={`hue-${hue}-${size}`}>
          {hue}
        </Next.Button>
      ))}
    </Next.Toolbar.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Button',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[48rem]' }), withTheme()],
  parameters: { layout: 'centered' },
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
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
 * colour, and every variant has a hover state. `caretDown` adds a smaller trailing caret (an icon-only button then
 * widens to fit it), `compact` pads by one inset, `tooltipSide` moves the label Tooltip, and `hue` fills with a Tag's
 * hue, shifting brightness on hover. The story ends with a tooltip open.
 */
export const Test: Story = {
  args: { allSizes: true, variants: true },
  play: async ({ canvasElement }) => {
    // A label never wraps: squeezed to a sliver, a button stays one control tall.
    const sample = canvasElement.querySelector<HTMLElement>('.nx-button:not([data-square])');
    if (sample) {
      const height = sample.getBoundingClientRect().height;
      sample.style.maxWidth = '2rem';
      await expect(sample.getBoundingClientRect().height).toBeCloseTo(height, 0);
      sample.style.maxWidth = '';
    }

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

      // A leading icon then the label, spaced by the gap and padded like a text button; a trailing icon mirrors it.
      const share = byTestId(canvasElement, `share-${size}`);
      await expect(share).toHaveTextContent('Share');
      await expect(share).toBeVisible();
      await expect(share).not.toHaveAttribute('aria-label');
      await expect(within(sizeRow(canvasElement, size)).getByRole('button', { name: 'Share' })).toBe(share);
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
    const addMd = md.getByRole('button', { name: 'Add' });
    await expect(addMd).toBe(byTestId(canvasElement, 'add-md'));
    await expect(addMd).not.toHaveAttribute('title');
    await expect(addMd).toHaveAttribute('type', 'button');
    await expect(md.getByRole('button', { name: 'Delete' })).toBeDisabled();
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
    await expectTooltip(addXs, 'Add');
    await expect(addXs).toHaveAccessibleDescription('Add');

    await userEvent.keyboard('{ArrowRight}');
    const removeXs = byTestId(canvasElement, 'remove-xs');
    await expect(removeXs).toHaveFocus();
    await expectTooltip(removeXs, 'Remove');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(body.getAllByRole('tooltip')).toHaveLength(1);

    const addLg = byTestId(canvasElement, 'add-lg');
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add');
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

    // Caret, compact, tooltip side and hue.
    for (const size of SIZES) {
      const { inset, icon } = GEOMETRY[size];
      const caret = byTestId(canvasElement, `caret-${size}`);
      const caretIcon = caret.querySelector('svg')?.getBoundingClientRect();
      await expect(caretIcon?.width, `caret-${size}`).toBeCloseTo(icon * 0.75, 0);
      await expect(caretIcon?.right, `caret-${size} end`).toBeCloseTo(
        caret.getBoundingClientRect().right - parseFloat(getComputedStyle(caret).paddingRight),
        0,
      );
      const iconCaret = byTestId(canvasElement, `icon-caret-${size}`);
      await expect(iconCaret.querySelectorAll('svg')).toHaveLength(2);
      await expect(iconCaret.getBoundingClientRect().height, `icon-caret-${size}`).toBeCloseTo(controlSize(size), 0);
      await expect(iconCaret.getBoundingClientRect().width).toBeGreaterThan(iconCaret.getBoundingClientRect().height);
      await expect(iconCaret).toHaveAttribute('aria-label', 'Style');
      await expect(parseFloat(getComputedStyle(byTestId(canvasElement, `compact-${size}`)).paddingLeft)).toBeCloseTo(
        inset,
        0,
      );
      await expect(byTestId(canvasElement, `icon-compact-${size}`).getBoundingClientRect().width).toBeCloseTo(
        icon + 2 * inset,
        0,
      );
    }
    const hues = HUES.map((hue) => getComputedStyle(byTestId(canvasElement, `hue-${hue}-md`)).backgroundColor);
    await expect(new Set(hues).size).toBe(HUES.length);
    await expect(hues).not.toContain(base.background);
    const red = byTestId(canvasElement, 'hue-red-md');
    await realHover(red);
    await waitFor(() => expect(getComputedStyle(red).filter).not.toBe('none'));
    const side = byTestId(canvasElement, 'side-md');
    await userEvent.hover(side);
    const sideTooltip = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
    await waitFor(() =>
      expect(sideTooltip.getBoundingClientRect().left).toBeGreaterThanOrEqual(side.getBoundingClientRect().right),
    );
    await userEvent.unhover(side);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // Rest on an open tooltip.
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add');
  },
};
