//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, controlSize, expectScoped, expectTooltip, realHover, realUnhover, sizeRow } from '../../testing.ts';

/** Icon-only toggles (one pressed, one disabled), a labelled toggle, a controlled one, and one with an `activeIcon`. */
const DefaultStory = ({ size }: SizeArgs) => {
  const [wrap, setWrap] = useState(false);
  return (
    <Next.Toolbar.Root>
      <Next.Toggle icon='ph--text-b--regular' label={`Bold ${size}`} iconOnly data-testid={`bold-${size}`} />
      <Next.Toggle icon='ph--text-italic--regular' label={`Italic ${size}`} iconOnly defaultPressed />
      <Next.Toggle icon='ph--text-underline--regular' label={`Underline ${size}`} iconOnly disabled />
      <Next.Toggle icon='ph--eye--regular' label={`Preview ${size}`} data-testid={`preview-${size}`} />
      <Next.Toggle
        icon='ph--arrows-in-line-horizontal--regular'
        label={`Wrap lines ${size}`}
        iconOnly
        pressed={wrap}
        onPressedChange={setWrap}
      />
      <Next.Toggle
        icon='ph--star--regular'
        activeIcon='ph--star--fill'
        label={`Pin ${size}`}
        iconOnly
        data-testid={`pin-${size}`}
      />
      <Next.Typography data-testid={`wrap-state-${size}`}>{wrap ? 'Wrapping' : 'Not wrapping'}</Next.Typography>
    </Next.Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Toggle',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[36rem]' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A button with `aria-pressed` that toggles on click and Space, and the pressed state takes the accent fill; a
 * labelled toggle is named by its text; `activeIcon` replaces the icon while pressed; like an icon-only Button, the
 * label shows in a Tooltip (left open).
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    for (const size of SIZES) {
      const rect = byTestId(canvasElement, `bold-${size}`).getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(controlSize(size), 0);
    }

    const bold = canvas.getByRole('button', { name: 'Bold md' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByRole('button', { name: 'Italic md' })).toHaveAttribute('aria-pressed', 'true');
    const unpressed = getComputedStyle(bold).backgroundColor;
    await userEvent.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
    await expect(getComputedStyle(bold).backgroundColor).not.toBe(unpressed);
    await userEvent.keyboard(' ');
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'false'));

    // A press suppresses the label only until the next focus or hover (DESIGN.md follow-up 48): after the click and the
    // Space toggle above, keyboard focus shows it, and so does a fresh hover.
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await expect(bold).toHaveFocus();
    await expectTooltip(bold, 'Bold md');
    bold.blur();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
    await realHover(bold);
    await expectTooltip(bold, 'Bold md');
    await realUnhover(bold);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // Controlled: the caller's state follows the toggle.
    await userEvent.click(canvas.getByRole('button', { name: 'Wrap lines md' }));
    await waitFor(() => expect(canvas.getByTestId('wrap-state-md')).toHaveTextContent('Wrapping'));
    await expect(canvas.getByRole('button', { name: 'Wrap lines md' })).toHaveAttribute('aria-pressed', 'true');

    const underline = canvas.getByRole('button', { name: 'Underline md' });
    await expect(underline).toBeDisabled();
    await expect(underline).not.toHaveAttribute('title');
    await expectScoped(canvasElement);

    const preview = byTestId(canvasElement, 'preview-md');
    await expect(canvas.getByRole('button', { name: 'Preview md' })).toBe(preview);
    await expect(preview).not.toHaveAttribute('aria-label');
    await userEvent.click(preview);
    await waitFor(() => expect(preview).toHaveAttribute('aria-pressed', 'true'));

    const pin = byTestId(canvasElement, 'pin-md');
    const href = () => pin.querySelector('use')?.getAttribute('href') ?? '';
    // The icon's href resolves once the sprite registry has the icon.
    await waitFor(() => expect(href()).toContain('ph--star--regular'));
    await userEvent.click(pin);
    await waitFor(() => expect(href()).toContain('ph--star--fill'));
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pin);
    await waitFor(() => expect(href()).toContain('ph--star--regular'));

    const italic = canvas.getByRole('button', { name: 'Italic md' });
    await userEvent.hover(italic);
    await expectTooltip(italic, 'Italic md');
  },
};
