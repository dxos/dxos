//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { GEOMETRY, byTestId, expectArrow, expectNoTooltip, expectTooltip } from '../../testing/geometry.ts';
import { withLayout, withTheme } from '../../testing/index.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button } from '../Button/Button.tsx';
import { Group } from '../Group/Group.tsx';
import { Input } from '../Input/Input.tsx';
import * as Tooltip from './Tooltip.tsx';

const LONG =
  'Publishing makes this space readable by anyone with the link. Members keep their roles, and you can unpublish at any time.';

const SIDES: readonly Tooltip.Side[] = ['top', 'right', 'bottom', 'left'];

/**
 * Two triggers, then an Input without a tooltip to tab onto; a trigger per side using the `content`/`side` shorthand; and two
 * TextTooltips, one truncated and one that fits.
 */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Group>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button data-testid={`save-${size}`}>Save</Button>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid={`save-tooltip-${size}`}>Save changes (&#x2318;S)</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button data-testid={`publish-${size}`}>Publish</Button>
        </Tooltip.Trigger>
        <Tooltip.Content size='lg'>{LONG}</Tooltip.Content>
      </Tooltip.Root>
      <Input aria-label='Note' data-testid={`note-${size}`} />
    </Group>
    <Group>
      {SIDES.map((side) => (
        <Tooltip.Trigger key={side} asChild content={`Opens on the ${side}`} side={side}>
          <Button data-testid={`side-${side}-${size}`}>{side}</Button>
        </Tooltip.Trigger>
      ))}
    </Group>
    <Tooltip.TextTooltip text={LONG} classNames='w-48' data-testid={`truncated-${size}`} />
    <Tooltip.TextTooltip text='Short' classNames='w-48' data-testid={`fits-${size}`} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Tooltip',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The computed colour of a ui-theme token, read from a probe beside `element` so it resolves in the same scope. */
const tokenColour = (element: HTMLElement, property: 'background-color' | 'color', token: string) => {
  const probe = element.ownerDocument.createElement('div');
  probe.style.setProperty(property, `var(${token})`);
  element.ownerDocument.body.append(probe);
  const colour = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return colour;
};

export const Default: Story = {};

/**
 * Keyboard focus shows the tooltip, linked to its trigger; tabbing straight to the next trigger swaps tooltips and the
 * second stays open past the open delay; tabbing off a trigger still closes its tooltip, although the close is deferred
 * by a task; hovering shows it after the delay, and long text wraps within the 20rem cap. One line is a compact chip,
 * shorter than the block. The tooltip takes its trigger row's size unless given its own. `Tooltip.Trigger content`
 * brings its own Root and Content, on `side`. A TextTooltip ellipsizes its text and shows it in full on hover only
 * while it is truncated. The tooltip and its arrow use the inverted surface, not the popup level. The story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const save = byTestId(canvasElement, 'save-xs');
    const publish = byTestId(canvasElement, 'publish-xs');

    await userEvent.tab();
    await expect(save).toHaveFocus();
    const tooltip = await body.findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('Save changes (\u2318S)');
    await expect(save).toHaveAttribute('aria-describedby', tooltip.id);
    await expect(save).toHaveAccessibleDescription('Save changes (\u2318S)');

    const content = body.getByTestId('save-tooltip-xs');
    await expect(content).not.toHaveAttribute('data-surface');
    // Inherits the trigger's row size.
    await expect(content).toHaveAttribute('data-size', 'xs');
    // The inverted surface, as the current Tooltip: not the popup level, and the arrow shares the fill.
    const fill = getComputedStyle(content).backgroundColor;
    await expect(fill).toBe(tokenColour(content, 'background-color', '--color-inverse-surface'));
    await expect(getComputedStyle(content).color).toBe(tokenColour(content, 'color', '--color-inverse-fg'));
    await expect(fill).not.toBe(tokenColour(content, 'background-color', '--dx-surface-popup'));
    await expectArrow(save, content);
    // A one-line chip: its line plus one control inset above and below, shorter than the block.
    const chip = content.getBoundingClientRect().height;
    await expect(chip).toBeCloseTo(parseFloat(getComputedStyle(content).lineHeight) + 2 * GEOMETRY.xs.inset, 0);
    await expect(chip).toBeLessThan(GEOMETRY.xs.block);

    await userEvent.tab();
    await expect(publish).toHaveFocus();
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    await new Promise((resolve) => setTimeout(resolve, 500));
    const tooltips = body.getAllByRole('tooltip');
    await expect(tooltips).toHaveLength(1);
    await expect(tooltips[0]).toHaveTextContent('Publishing');
    // An explicit size wins over the inherited one.
    await expect(tooltips[0]).toHaveAttribute('data-size', 'lg');
    await expect(publish).toHaveAttribute('aria-describedby', tooltips[0].id);

    await userEvent.tab();
    await expect(byTestId(canvasElement, 'note-xs')).toHaveFocus();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    const side = byTestId(canvasElement, 'side-right-md');
    await userEvent.hover(side);
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Opens on the right'));
    await waitFor(() =>
      expect(body.getByRole('tooltip').getBoundingClientRect().left).toBeGreaterThanOrEqual(
        side.getBoundingClientRect().right,
      ),
    );
    await expect(body.getByRole('tooltip').getBoundingClientRect().height).toBeLessThan(GEOMETRY.md.block);
    await userEvent.unhover(side);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // The arrow points at the trigger on every side, its outer half clear of the tooltip's ring.
    for (const placement of SIDES) {
      const trigger = byTestId(canvasElement, `side-${placement}-md`);
      await userEvent.hover(trigger);
      await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent(`Opens on the ${placement}`));
      const tooltip = body.getByRole('tooltip');
      await expect(tooltip).toHaveAttribute('data-side', placement);
      await expectArrow(trigger, tooltip);
      await userEvent.unhover(trigger);
      await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
    }

    const truncated = byTestId(canvasElement, 'truncated-md');
    await expect(truncated.scrollWidth).toBeGreaterThan(truncated.clientWidth);
    await userEvent.hover(truncated);
    await expectTooltip(truncated, 'Publishing makes this space');
    await userEvent.unhover(truncated);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
    const fits = byTestId(canvasElement, 'fits-md');
    const watch = expectNoTooltip(canvasElement, 700);
    await userEvent.hover(fits);
    await watch;
    await userEvent.unhover(fits);

    await userEvent.hover(byTestId(canvasElement, 'publish-md'));
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    const long = body.getByRole('tooltip').getBoundingClientRect();
    await expect(long.width).toBeLessThanOrEqual(320.5);
    await expect(long.height).toBeGreaterThan(40);
  },
};
