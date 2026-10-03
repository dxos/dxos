//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
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
  sizeRow,
} from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import {
  Button,
  type ButtonHue,
  type ButtonValence,
  type ButtonVariant,
  Group,
  Toggle,
  ToggleGroup,
  Toolbar,
} from '../index.ts';

/** Every variant, with the `valence` variant once bare and once per valence. */
const VARIANTS: { name: string; variant: ButtonVariant; valence?: ButtonValence }[] = [
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

const HUES: ButtonHue[] = ['neutral', 'red', 'amber', 'emerald', 'sky', 'error'];

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
    <Toolbar.Root data-testid={`toolbar-${size}`}>
      <Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
      <Button icon='ph--minus--regular' label='Remove' iconOnly data-testid={`remove-${size}`} />
      <Button icon='ph--trash--regular' label='Delete' iconOnly disabled />
      <Button data-testid={`button-${size}`}>Save</Button>
      <Button variant='primary' data-testid={`primary-${size}`}>
        Publish
      </Button>
      <Button disabled data-testid={`disabled-${size}`}>
        Archive
      </Button>
      <Button icon='ph--share--regular' label='Share' data-testid={`share-${size}`} />
      <Button iconEnd='ph--caret-down--regular' label='More' data-testid={`more-${size}`} />
    </Toolbar.Root>
    {variants && (
      <Group>
        {VARIANTS.map(({ name, variant, valence }) => (
          <Group key={name}>
            <Button
              icon='ph--star--regular'
              label={name}
              iconOnly
              variant={variant}
              valence={valence}
              data-testid={`icon-variant-${name}-${size}`}
            />
            <Button variant={variant} valence={valence} data-testid={`variant-${name}-${size}`}>
              {name}
            </Button>
          </Group>
        ))}
      </Group>
    )}
    <Toolbar.Root>
      <Button caretDown data-testid={`caret-${size}`}>
        Format
      </Button>
      <Button icon='ph--text-aa--regular' label='Style' iconOnly caretDown data-testid={`icon-caret-${size}`} />
      <Button compact data-testid={`compact-${size}`}>
        1
      </Button>
      <Button icon='ph--caret-left--regular' label='Previous' iconOnly compact data-testid={`icon-compact-${size}`} />
      <Button icon='ph--info--regular' label='Details' iconOnly tooltipSide='right' data-testid={`side-${size}`} />
      {HUES.map((hue) => (
        <Button key={hue} hue={hue} data-testid={`hue-${hue}-${size}`}>
          {hue}
        </Button>
      ))}
    </Toolbar.Root>
    <Group fill>
      <Button align='start' icon='ph--file--regular' data-testid={`align-start-${size}`}>
        Packed at the start
      </Button>
    </Group>
    <Group>
      <Button icon='ph--spinner-gap--regular' spin data-testid={`spin-${size}`}>
        Saving
      </Button>
      <Button icon='ph--star--regular' label='Large icon' iconOnly iconSize='lg' data-testid={`icon-size-${size}`} />
      <Button
        icon='ph--check-circle--regular'
        iconClassNames='text-success-text'
        label='Synced'
        data-testid={`icon-class-${size}`}
      />
    </Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Button',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[48rem]' }), withTheme()],
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
 * hue, shifting brightness on hover. `align='start'` packs a stretched button's content at its start, `spin` spins the
 * leading icon, `iconSize` takes another size's icon scale, and `iconClassNames` styles the leading icon. The story ends with a tooltip open.
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
      // The cell starts after the toolbar's inline padding.
      const toolbarPadding = parseFloat(
        getComputedStyle(byTestId(canvasElement, `add-${size}`).closest('.nx-toolbar') ?? canvasElement).paddingLeft,
      );
      await expect(add.left - inset, `add-${size} cell`).toBeCloseTo(toolbar.left + toolbarPadding, 0);

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
      // The caret sits a full gap after a label.
      const gap = parseFloat(getComputedStyle(caret).columnGap);
      // The label is a text node, so measure it through a Range.
      const text = Array.from(caret.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      const range = document.createRange();
      if (text) {
        range.selectNodeContents(text);
      }
      await expect((caretIcon?.left ?? 0) - range.getBoundingClientRect().right, `caret-${size} gap`).toBeCloseTo(
        gap,
        0,
      );
      const iconCaret = byTestId(canvasElement, `icon-caret-${size}`);
      await expect(iconCaret.querySelectorAll('svg')).toHaveLength(2);
      const [leading, trailing] = Array.from(iconCaret.querySelectorAll('svg')).map((svg) =>
        svg.getBoundingClientRect(),
      );
      // With no label the icon keeps its square's padding, the caret follows a narrow gap, and its end padding matches.
      const box = iconCaret.getBoundingClientRect();
      const halfBlock = (controlSize(size) + 2 * inset) / 2;
      const padding = (controlSize(size) - leading.width) / 2;
      await expect(leading.left - box.left, `icon-caret-${size} padding`).toBeCloseTo(padding, 0);
      await expect(trailing.left - leading.right, `icon-caret-${size} gap`).toBeCloseTo(
        (halfBlock - trailing.width) / 2,
        0,
      );
      await expect(box.right - trailing.right, `icon-caret-${size} end padding`).toBeCloseTo(padding, 0);
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

    const aligned = byTestId(canvasElement, 'align-start-md');
    const alignedIcon = aligned.querySelector('svg')?.getBoundingClientRect();
    await expect(aligned.getBoundingClientRect().width).toBeGreaterThan(300);
    await expect((alignedIcon?.left ?? 0) - aligned.getBoundingClientRect().left).toBeCloseTo(
      parseFloat(getComputedStyle(aligned).paddingLeft),
      0,
    );
    const spinner = byTestId(canvasElement, 'spin-md').querySelector('svg');
    await expect(spinner && getComputedStyle(spinner).animationName).toBe('nx-spin');
    await expect(byTestId(canvasElement, 'icon-class-md').querySelector('svg')).toHaveClass('text-success-text');
    for (const size of SIZES) {
      const glyph = byTestId(canvasElement, `icon-size-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(glyph?.width, size).toBeCloseTo(GEOMETRY.lg.icon, 0);
    }

    // Rest on an open tooltip.
    await userEvent.hover(addLg);
    await expectTooltip(addLg, 'Add');

    // The focus ring takes the theme's own focus slot, not a hard-coded hue.
    const probe = (color: string) => {
      const element = canvasElement.ownerDocument.createElement('span');
      element.style.color = color;
      canvasElement.append(element);
      const resolved = getComputedStyle(element).color;
      element.remove();
      return resolved;
    };
    await expect(probe('var(--nx-focus-ring-color)')).toBe(probe('var(--color-focus)'));
    await expect(probe('var(--color-focus)')).not.toBe(probe('var(--color-secondary-border)'));
  },
};

/** One md scope holding a text, an icon-only, a compact, an `iconSize`d button, a Toggle and a ToggleGroup item per `size`. */
const SizesStory = () => (
  <>
    {SIZES.map((size) => (
      <Group key={size}>
        <Button size={size} icon='ph--share--regular' data-testid={`sized-${size}`}>
          {size}
        </Button>
        <Button size={size} icon='ph--plus--regular' label='Add' iconOnly data-testid={`sized-icon-${size}`} />
        <Button size={size} compact data-testid={`sized-compact-${size}`}>
          1
        </Button>
        <Button
          size={size}
          icon='ph--star--regular'
          label='Star'
          iconOnly
          iconSize='lg'
          data-testid={`sized-icon-size-${size}`}
        />
        <Toggle size={size} icon='ph--push-pin--regular' label='Pin' iconOnly data-testid={`sized-toggle-${size}`} />
        <ToggleGroup.Root type='single'>
          <ToggleGroup.Item size={size} value='bold' data-testid={`sized-toggle-group-${size}`}>
            Bold
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </Group>
    ))}
  </>
);

/**
 * `size` scopes one button inside an md scope: each is its size's control height, an icon-only button is a square of
 * it inset by its size's inset with its size's icon, compact pads by its size's inset, `iconSize` still overrides the
 * icon, and Toggle and ToggleGroup items take `size` as Buttons do.
 */
export const Sizes: Story = {
  render: () => <SizesStory />,
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { inset, icon } = GEOMETRY[size];
      for (const part of ['sized', 'sized-icon', 'sized-compact', 'sized-toggle', 'sized-toggle-group']) {
        const button = byTestId(canvasElement, `${part}-${size}`);
        await expect(button).toHaveAttribute('data-size', size);
        await expect(button.getBoundingClientRect().height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
      }
      const square = byTestId(canvasElement, `sized-icon-${size}`);
      await expect(square.getBoundingClientRect().width, `sized-icon-${size} width`).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(square).marginTop), `sized-icon-${size} inset`).toBeCloseTo(inset, 0);
      await expect(square.querySelector('svg')?.getBoundingClientRect().width, `sized-icon-${size} icon`).toBeCloseTo(
        icon,
        0,
      );
      const compact = getComputedStyle(byTestId(canvasElement, `sized-compact-${size}`));
      await expect(parseFloat(compact.paddingLeft), `sized-compact-${size} padding`).toBeCloseTo(inset, 0);
      const glyph = byTestId(canvasElement, `sized-icon-size-${size}`).querySelector('svg')?.getBoundingClientRect();
      await expect(glyph?.width, `sized-icon-size-${size} icon`).toBeCloseTo(GEOMETRY.lg.icon, 0);
    }
  },
};
