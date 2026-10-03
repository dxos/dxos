//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { byTestId, controlSize, expectScoped, expectTooltip, realHover, realUnhover, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Toolbar from '../Toolbar/Toolbar.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Toggle from './Toggle.tsx';

/** Icon-only toggles (one pressed, one disabled), a labelled toggle, a controlled one, and one with an `activeIcon`. */
const DefaultStory = ({ size }: SizeArgs) => {
  const [wrap, setWrap] = useState(false);
  return (
    <Toolbar.Root>
      <Toggle.Toggle icon='ph--text-b--regular' label='Bold' iconOnly data-testid={`bold-${size}`} />
      <Toggle.Toggle icon='ph--text-italic--regular' label='Italic' iconOnly defaultPressed />
      <Toggle.Toggle icon='ph--text-underline--regular' label='Underline' iconOnly disabled />
      <Toggle.Toggle icon='ph--eye--regular' label='Preview' data-testid={`preview-${size}`} />
      <Toggle.Toggle
        icon='ph--arrows-in-line-horizontal--regular'
        label='Wrap lines'
        iconOnly
        pressed={wrap}
        onPressedChange={setWrap}
      />
      <Toggle.Toggle
        icon='ph--star--regular'
        activeIcon='ph--star--fill'
        label='Pin'
        iconOnly
        data-testid={`pin-${size}`}
      />
      <Typography.Typography data-testid={`wrap-state-${size}`}>
        {wrap ? 'Wrapping' : 'Not wrapping'}
      </Typography.Typography>
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toggle',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[36rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
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
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    for (const size of SIZES) {
      const rect = byTestId(canvasElement, `bold-${size}`).getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(controlSize(size), 0);
    }

    const bold = canvas.getByRole('button', { name: 'Bold' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
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
    await expectTooltip(bold, 'Bold');
    bold.blur();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
    await realHover(bold);
    await expectTooltip(bold, 'Bold');
    await realUnhover(bold);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    // Controlled: the caller's state follows the toggle.
    await userEvent.click(canvas.getByRole('button', { name: 'Wrap lines' }));
    await waitFor(() => expect(canvas.getByTestId('wrap-state-md')).toHaveTextContent('Wrapping'));
    await expect(canvas.getByRole('button', { name: 'Wrap lines' })).toHaveAttribute('aria-pressed', 'true');

    const underline = canvas.getByRole('button', { name: 'Underline' });
    await expect(underline).toBeDisabled();
    await expect(underline).not.toHaveAttribute('title');
    await expectScoped(canvasElement);

    const preview = byTestId(canvasElement, 'preview-md');
    await expect(canvas.getByRole('button', { name: 'Preview' })).toBe(preview);
    await expect(preview).not.toHaveAttribute('aria-label');
    await userEvent.click(preview);
    await waitFor(() => expect(preview).toHaveAttribute('aria-pressed', 'true'));

    const pin = byTestId(canvasElement, 'pin-md');
    const href = () => pin.querySelector('[data-scope="icon"]')?.getAttribute('data-icon') ?? '';
    // The icon's href resolves once the sprite registry has the icon.
    await waitFor(() => expect(href()).toContain('ph--star--regular'));
    await userEvent.click(pin);
    await waitFor(() => expect(href()).toContain('ph--star--fill'));
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pin);
    await waitFor(() => expect(href()).toContain('ph--star--regular'));

    const italic = canvas.getByRole('button', { name: 'Italic' });
    await userEvent.hover(italic);
    await expectTooltip(italic, 'Italic');
  },
};
