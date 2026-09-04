//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Editable, type EditableActivation, type EditableBlurBehavior } from './Editable';
import { useEditable } from './useEditable';

type StoryArgs = {
  label?: string;
  /** Holds the field open, as a pane editor does. */
  held?: boolean;
  /** Names the preview, to prove a caller's own label survives the machine's. */
  previewLabel?: string;
  initialValue?: string;
  placeholder?: string;
  activation?: EditableActivation;
  blurBehavior?: EditableBlurBehavior;
  disabled?: boolean;
};

const DefaultStory = ({
  label = 'Title',
  previewLabel,
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
          <Editable.Preview aria-label={previewLabel} />
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
    // The machine focuses the input a frame later; typing before it lands sends the keystrokes
    // nowhere and the assertions below would pass without the revert ever running.
    const input = await canvas.findByTestId('editable.input');
    await waitFor(async () => expect(input).toHaveFocus());
    await userEvent.keyboard('Discard me{Escape}');
    await waitFor(async () => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Untitled'));
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('No commits yet');
  },
};

export const TestKeyboard: Story = {
  // The preview opens on a click, which a keyboard reader does not have. Without a door of its own
  // it is a tab stop that answers nothing.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('editable.preview');
    await expect(preview).toHaveAttribute('role', 'button');

    preview.focus();
    await expect(preview).toHaveFocus();
    // Focus alone must not open it: tabbing across a list of these would put every row into edit on
    // the way past.
    await expect(canvas.getByTestId('editable.input')).not.toBeVisible();

    await userEvent.keyboard('{Enter}');
    const input = await canvas.findByTestId('editable.input');
    await waitFor(async () => expect(input).toBeVisible());
    await waitFor(async () => expect(input).toHaveFocus());

    await userEvent.keyboard('{Control>}a{/Control}Renamed by keyboard{Enter}');
    await waitFor(async () => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Renamed by keyboard'));
  },
};

export const TestLabel: Story = {
  args: { previewLabel: 'Document title' },
  // The machine names every preview "edit", which says what the gesture does rather than what the
  // field holds. A caller that names it has to win.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('editable.preview')).toHaveAttribute('aria-label', 'Document title');
  },
};

/**
 * A field held open by its host, driven through the hook rather than the component — the shape a
 * pane editor takes, where there is nothing to click into and a control elsewhere says when to
 * write.
 */
const HeldOpenStory = ({ initialValue = 'Ship the spring release', held = true }: StoryArgs) => {
  const [value, setValue] = useState(initialValue);
  const [commits, setCommits] = useState<string[]>([]);
  const { draft, editing, setDraft, edit, commit, revert } = useEditable({
    value,
    // Held open, the pane IS the editor and this never flips. Left alone, the machine owns the
    // state and announces the commit itself — the route `commit` must not write a second time.
    editing: held ? true : undefined,
    onValueChange: (next) => {
      setValue(next);
      setCommits((commits) => [...commits, next]);
    },
  });

  return (
    <div className='flex flex-col gap-2 min-w-[24rem]'>
      <input
        data-testid='held.input'
        className='dx-input'
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className='flex gap-2'>
        <button type='button' data-testid='held.edit' onClick={() => edit()}>
          Edit
        </button>
        <button type='button' data-testid='held.commit' onClick={() => commit()}>
          Commit
        </button>
        <button type='button' data-testid='held.revert' onClick={() => revert()}>
          Revert
        </button>
      </div>
      <div data-testid='held.editing'>{editing ? 'editing' : 'preview'}</div>
      <div data-testid='held.value'>{value}</div>
      <div data-testid='held.commits'>{commits.length === 0 ? 'none' : commits.join(' · ')}</div>
    </div>
  );
};

export const TestHeldOpen: Story = {
  render: HeldOpenStory,
  // A field whose editing state is controlled never leaves edit on its own, so the machine treats a
  // submit as a request to the host and announces only the state change. Nothing would ever be
  // written, which is exactly what a pane editor is for.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('held.input');

    await userEvent.clear(input);
    await userEvent.type(input, 'Ship the summer release');
    // Typing alone writes nothing: a keystroke is not a commit.
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('none');

    canvas.getByTestId('held.commit').click();
    await waitFor(async () => expect(canvas.getByTestId('held.value')).toHaveTextContent('Ship the summer release'));
    // Once, not twice — the caller's commit and the machine's own announcement are one edit.
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('Ship the summer release');
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');

    // And a revert restores the committed text rather than leaving the abandoned draft behind.
    await userEvent.clear(input);
    await userEvent.type(input, 'Abandoned');
    canvas.getByTestId('held.revert').click();
    await waitFor(async () => expect(canvas.getByTestId('held.input')).toHaveValue('Ship the summer release'));
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('Ship the summer release');
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');
  },
};

export const TestUncontrolledCommit: Story = {
  render: HeldOpenStory,
  args: { held: false },
  // The same `commit()` against a field the machine owns: here it announces the edit itself, so the
  // caller's own delivery has to collapse into that one rather than write a second time.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Opened first: a field at rest reconciles to the value its host holds, so text put into it
    // before it is editing is not a pending edit and is rightly discarded.
    canvas.getByTestId('held.edit').click();
    await waitFor(async () => expect(canvas.getByTestId('held.editing')).toHaveTextContent('editing'));

    const input = canvas.getByTestId('held.input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Ship the summer release');
    canvas.getByTestId('held.commit').click();

    await waitFor(async () => expect(canvas.getByTestId('held.value')).toHaveTextContent('Ship the summer release'));
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('Ship the summer release');
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');
  },
};
