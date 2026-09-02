//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Editable, type EditableActivation, type EditableBlurBehavior } from './Editable';

type StoryArgs = {
  label?: string;
  initialValue?: string;
  placeholder?: string;
  activation?: EditableActivation;
  blurBehavior?: EditableBlurBehavior;
  disabled?: boolean;
};

const DefaultStory = ({
  label = 'Title',
  initialValue = 'Ship the spring release',
  placeholder = 'Untitled',
  activation,
  blurBehavior,
  disabled,
}: StoryArgs) => {
  const [value, setValue] = useState(initialValue);
  const [commits, setCommits] = useState<string[]>([]);

  return (
    <div className='flex flex-col gap-4 min-w-[24rem]'>
      <div>
        <div className='text-sm text-description'>{label}</div>
        <Editable.Root
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setCommits((commits) => [...commits, next]);
          }}
          placeholder={placeholder}
          activation={activation}
          blurBehavior={blurBehavior}
          disabled={disabled}
        >
          <Editable.Preview />
          <Editable.Input />
        </Editable.Root>
      </div>
      {/* `onValueChange` fires on commit, never per keystroke — visible here as one entry per edit. */}
      <div className='text-sm text-description' data-testid='editable.commits'>
        {commits.length === 0 ? 'No commits yet' : `Commits: ${commits.join(' · ')}`}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Editable',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DoubleClick: Story = {
  args: { activation: 'dblclick', label: 'Title (double-click to edit)' },
};

export const RevertOnBlur: Story = {
  args: { blurBehavior: 'revert', label: 'Title (blur reverts)' },
};

export const Empty: Story = {
  args: { initialValue: '', label: 'Title (empty shows the placeholder)' },
};

export const Disabled: Story = {
  args: { disabled: true, label: 'Title (disabled)' },
};

export const Test: Story = {
  // The point of the component is that the text does not move when it becomes editable, which only
  // geometry shows: the DOM changes either way.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const glyphLeft = (element: Element) => {
      const { left } = element.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(element).paddingInlineStart);
      return Math.round(left + pad);
    };
    const glyphTop = (element: Element) => {
      const { top, height } = element.getBoundingClientRect();
      return Math.round(top + height / 2);
    };

    const preview = canvas.getByTestId('editable.preview');
    await expect(preview).toHaveTextContent('Ship the spring release');
    const previewBox = preview.getBoundingClientRect();
    const previewLeft = glyphLeft(preview);
    const previewMiddle = glyphTop(preview);

    // Click swaps in the input, focused with the caret at the end so typing amends rather than
    // replacing — a select-all would make the next keystroke a silent delete.
    await userEvent.click(preview);
    const input = await canvas.findByTestId('editable.input');
    await waitFor(async () => expect(input).toHaveFocus());
    const end = 'Ship the spring release'.length;
    await expect((input as HTMLInputElement).selectionStart).toEqual(end);
    await expect((input as HTMLInputElement).selectionEnd).toEqual(end);

    // ...and it occupies the same box, so nothing on the row shifts.
    const inputBox = input.getBoundingClientRect();
    await expect(Math.round(inputBox.height)).toEqual(Math.round(previewBox.height));
    await expect(Math.round(inputBox.width)).toEqual(Math.round(previewBox.width));
    await expect(glyphLeft(input)).toEqual(previewLeft);
    await expect(glyphTop(input)).toEqual(previewMiddle);

    // Escape reverts, and commits nothing.
    await userEvent.keyboard('{Control>}a{/Control}Rewritten{Escape}');
    await waitFor(async () =>
      expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Ship the spring release'),
    );
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('No commits yet');

    // Enter commits, once.
    await userEvent.click(canvas.getByTestId('editable.preview'));
    await userEvent.keyboard('{Control>}a{/Control}Ship the summer release{Enter}');
    await waitFor(async () =>
      expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Ship the summer release'),
    );
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('Commits: Ship the summer release');
  },
};

export const TestDisabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('editable.preview');
    await userEvent.click(preview);
    // Still the preview: a disabled field cannot be opened by clicking it. The input is in the DOM
    // either way — the machine hides the part that is out of play rather than unmounting it, so the
    // two never claim a row apiece.
    await expect(canvas.getByTestId('editable.input')).not.toBeVisible();
    await expect(preview).toBeVisible();
  },
};

export const TestRevertFromEmpty: Story = {
  args: { initialValue: '' },
  // A field opened on nothing is the one `Escape` has to be trusted on: there is no committed text
  // to fall back to, so a revert that keeps what was typed writes it instead of discarding it.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('editable.preview'));
    await userEvent.keyboard('Discard me{Escape}');
    await waitFor(async () => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Untitled'));
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('No commits yet');
  },
};
