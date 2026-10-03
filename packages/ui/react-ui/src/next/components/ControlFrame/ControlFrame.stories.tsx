//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button, ControlFrame, Icon } from '../index.ts';

/** An editor stand-in (a one-line `contenteditable`) in a frame with adornments, a mono frame, and a disabled one. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <ControlFrame
      start={<Icon icon='ph--code--regular' />}
      end={<Button icon='ph--x--regular' label='Clear' iconOnly variant='ghost' />}
      data-testid={`frame-${size}`}
    >
      <div role='textbox' aria-label='Expression' contentEditable suppressContentEditableWarning tabIndex={0}>
        a + b
      </div>
    </ControlFrame>
    <ControlFrame variant='mono' data-testid={`mono-${size}`}>
      <div role='textbox' aria-label='Key' contentEditable suppressContentEditableWarning tabIndex={0}>
        sk-0001
      </div>
    </ControlFrame>
    <ControlFrame disabled data-testid={`disabled-${size}`}>
      <div role='textbox' aria-label='Read-only' aria-disabled>
        Locked
      </div>
    </ControlFrame>
    {/* The editable is nested, as an editor's content element is under its own root. */}
    <ControlFrame rows={3} start={<Icon icon='ph--text-aa--regular' />} data-testid={`rows-${size}`}>
      <div>
        <div
          role='textbox'
          aria-label='Notes'
          aria-multiline
          contentEditable
          suppressContentEditableWarning
          tabIndex={0}
        >
          One line
        </div>
      </div>
    </ControlFrame>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/ControlFrame',
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

    // A `rows` frame is that many lines tall at least, its first line and adornment where a single-line frame's sit,
    // and grows with its content.
    const rows = byTestId(canvasElement, 'rows-md');
    const notes = within(rows).getByRole('textbox', { name: 'Notes' });
    const lineHeight = notes.getBoundingClientRect().height;
    const minimum = 3 * lineHeight + controlSize('md') - lineHeight;
    await expect(rows.getBoundingClientRect().height).toBeCloseTo(minimum, 0);
    const editorTop = editor.getBoundingClientRect().top - frame.getBoundingClientRect().top;
    await expect(notes.getBoundingClientRect().top - rows.getBoundingClientRect().top).toBeCloseTo(editorTop, 0);
    const rowsIcon = rows.querySelector('svg')?.getBoundingClientRect();
    const notesTop = notes.getBoundingClientRect().top;
    await expect((rowsIcon?.top ?? 0) + (rowsIcon?.height ?? 0) / 2).toBeCloseTo(notesTop + lineHeight / 2, 0);
    notes.textContent = '';
    for (const line of ['1', '2', '3', '4', '5']) {
      const block = canvasElement.ownerDocument.createElement('div');
      block.textContent = line;
      notes.appendChild(block);
    }
    await expect(rows.getBoundingClientRect().height).toBeCloseTo(minimum + 2 * lineHeight, 0);
    // The ring follows focus nested below the frame's content element too.
    await userEvent.click(notes);
    await expect(getComputedStyle(rows).outlineStyle).toBe('solid');
  },
};
