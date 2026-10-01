//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

/** An editor stand-in (a one-line `contenteditable`) in a frame with adornments, a mono frame, and a disabled one. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.ControlFrame
      start={<Next.Icon icon='ph--code--regular' />}
      end={<Next.Button icon='ph--x--regular' label='Clear' iconOnly variant='ghost' />}
      data-testid={`frame-${size}`}
    >
      <div role='textbox' aria-label='Expression' contentEditable suppressContentEditableWarning tabIndex={0}>
        a + b
      </div>
    </Next.ControlFrame>
    <Next.ControlFrame variant='mono' data-testid={`mono-${size}`}>
      <div role='textbox' aria-label='Key' contentEditable suppressContentEditableWarning tabIndex={0}>
        sk-0001
      </div>
    </Next.ControlFrame>
    <Next.ControlFrame disabled data-testid={`disabled-${size}`}>
      <div role='textbox' aria-label='Read-only' aria-disabled>
        Locked
      </div>
    </Next.ControlFrame>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/ControlFrame',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A frame is control-tall and centred in its block like an Input at every size; its own content fills the row between
 * the adornments, and the ring follows focus in that content but not in an adornment. `mono` sets the monospace font
 * and `disabled` dims the frame.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const frame = byTestId(canvasElement, `frame-${size}`);
      await expect(frame.getBoundingClientRect().height, `frame-${size}`).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(frame).marginTop), `frame-${size} inset`).toBeCloseTo(
        GEOMETRY[size].inset,
        0,
      );
    }
    await expectScoped(canvasElement);

    const canvas = within(sizeRow(canvasElement, 'md'));
    const frame = byTestId(canvasElement, 'frame-md');
    await expect(frame).toHaveAttribute('data-scope', 'control-frame');
    const editor = canvas.getByRole('textbox', { name: 'Expression' });
    const icon = frame.querySelector('svg');
    const clear = canvas.getByRole('button', { name: 'Clear' });
    await expect(icon?.getBoundingClientRect().right).toBeLessThan(editor.getBoundingClientRect().left);
    await expect(editor.getBoundingClientRect().right).toBeLessThan(clear.getBoundingClientRect().left);

    await userEvent.click(editor);
    await expect(editor).toHaveFocus();
    await expect(getComputedStyle(frame).outlineStyle).toBe('solid');
    await userEvent.tab();
    await expect(clear).toHaveFocus();
    await expect(getComputedStyle(frame).outlineStyle).toBe('none');

    const mono = getComputedStyle(byTestId(canvasElement, 'mono-md')).fontFamily;
    await expect(mono).not.toBe(getComputedStyle(frame).fontFamily);
    await expect(mono).toMatch(/mono/i);
    await expect(getComputedStyle(byTestId(canvasElement, 'disabled-md')).opacity).toBe('0.5');
  },
};
