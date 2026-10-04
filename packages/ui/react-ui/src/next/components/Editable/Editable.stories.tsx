//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { controlSize } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Button from '../Button/Button.tsx';
import * as Input from '../Input/Input.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Editable from './Editable.tsx';
import { useEditable } from './useEditable.ts';

type StoryArgs = SizeArgs &
  Pick<Editable.RootProps, 'activation' | 'blurBehavior' | 'disabled' | 'placeholder'> & {
    /** Names the preview, to prove a caller's own label survives the machine's. */
    previewLabel?: string;
    initialValue?: string;
    /** Holds the field open, as a pane editor does (hook stories only). */
    held?: boolean;
  };

const DefaultStory = ({
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
    <>
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
        <Editable.Preview aria-label={previewLabel} data-testid='editable.preview' />
        <Editable.Input data-testid='editable.input' />
      </Editable.Root>
      {/* `onValueChange` fires on commit, never per keystroke: one entry per edit. */}
      <Typography.Text tone='muted' data-testid='editable.commits'>
        {commits.length === 0 ? 'No commits yet' : `Commits: ${commits.join(' · ')}`}
      </Typography.Text>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Editable',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: {
    ...SIZE_ARG_TYPES,
    activation: { control: 'select', options: ['click', 'dblclick', 'focus', 'none'] },
    blurBehavior: { control: 'select', options: ['commit', 'revert'] },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The text does not move when it becomes editable (only geometry shows it); Escape reverts and Enter commits once. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const glyphLeft = (element: Element) =>
      Math.round(element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingInlineStart));
    const glyphMiddle = (element: Element) => {
      const { top, height } = element.getBoundingClientRect();
      return Math.round(top + height / 2);
    };

    const preview = canvas.getByTestId('editable.preview');
    await expect(preview).toHaveTextContent('Ship the spring release');
    await expect(preview).toHaveAttribute('data-scope', 'editable');
    const previewBox = preview.getBoundingClientRect();
    await expect(previewBox.height).toBeCloseTo(controlSize('md'), 0);
    const previewLeft = glyphLeft(preview);

    // A click swaps in the input, focused with the caret at the end so typing amends rather than replaces.
    await userEvent.click(preview);
    const input = await canvas.findByTestId<HTMLInputElement>('editable.input');
    await waitFor(() => expect(input).toHaveFocus());
    const end = 'Ship the spring release'.length;
    await expect(input.selectionStart).toEqual(end);
    await expect(input.selectionEnd).toEqual(end);

    // ...in the same box, so nothing on the row shifts.
    const inputBox = input.getBoundingClientRect();
    await expect(Math.round(inputBox.height)).toEqual(Math.round(previewBox.height));
    await expect(Math.round(inputBox.width)).toEqual(Math.round(previewBox.width));
    await expect(glyphLeft(input)).toEqual(previewLeft);
    await expect(glyphMiddle(input)).toEqual(Math.round(previewBox.top + previewBox.height / 2));

    // Escape reverts and commits nothing.
    await userEvent.keyboard('{Control>}a{/Control}Rewritten{Escape}');
    await waitFor(() => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Ship the spring release'));
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('No commits yet');

    // Enter commits, once.
    await userEvent.click(canvas.getByTestId('editable.preview'));
    await userEvent.keyboard('{Control>}a{/Control}Ship the summer release{Enter}');
    await waitFor(() => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Ship the summer release'));
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('Commits: Ship the summer release');
  },
};

/** A disabled field cannot be opened; the input stays mounted but hidden, so the two never claim a row apiece. */
export const TestDisabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('editable.preview');
    await userEvent.click(preview);
    await expect(canvas.getByTestId('editable.input')).not.toBeVisible();
    await expect(preview).toBeVisible();
  },
};

/** Escape on a field opened empty discards what was typed rather than keeping it. */
export const TestRevertFromEmpty: Story = {
  args: { initialValue: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Untitled');
    await userEvent.click(canvas.getByTestId('editable.preview'));
    // The machine focuses the input a frame later; typing before then sends the keystrokes nowhere.
    const input = await canvas.findByTestId('editable.input');
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard('Discard me{Escape}');
    await waitFor(() => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Untitled'));
    await expect(canvas.getByTestId('editable.commits')).toHaveTextContent('No commits yet');
  },
};

/** A click-activated preview is a button a keyboard reader can open with Enter; focus alone does not open it. */
export const TestKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId('editable.preview');
    await expect(preview).toHaveAttribute('role', 'button');

    preview.focus();
    await expect(preview).toHaveFocus();
    await expect(canvas.getByTestId('editable.input')).not.toBeVisible();

    await userEvent.keyboard('{Enter}');
    const input = await canvas.findByTestId('editable.input');
    await waitFor(() => expect(input).toBeVisible());
    await waitFor(() => expect(input).toHaveFocus());

    await userEvent.keyboard('{Control>}a{/Control}Renamed by keyboard{Enter}');
    await waitFor(() => expect(canvas.getByTestId('editable.preview')).toHaveTextContent('Renamed by keyboard'));
  },
};

/** A caller's name for the preview wins over the machine's generic "edit". */
export const TestLabel: Story = {
  args: { previewLabel: 'Document title' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('editable.preview')).toHaveAttribute('aria-label', 'Document title');
  },
};

/** A field driven through the hook, as a pane editor is: nothing to click into, and a control elsewhere writes. */
const HeldOpenStory = ({ initialValue = 'Ship the spring release', held = true }: StoryArgs) => {
  const [value, setValue] = useState(initialValue);
  const [commits, setCommits] = useState<string[]>([]);
  const { draft, editing, setDraft, edit, commit, revert } = useEditable({
    value,
    // Held open, the pane IS the editor; left alone, the machine announces the commit itself.
    editing: held ? true : undefined,
    onValueChange: (next) => {
      setValue(next);
      setCommits((commits) => [...commits, next]);
    },
  });

  return (
    <>
      <Input.Input data-testid='held.input' value={draft} onChange={(event) => setDraft(event.target.value)} />
      <div className='flex gap-2'>
        <Button.Button data-testid='held.edit' onClick={() => edit()}>
          Edit
        </Button.Button>
        <Button.Button data-testid='held.commit' onClick={() => commit()}>
          Commit
        </Button.Button>
        <Button.Button data-testid='held.revert' onClick={() => revert()}>
          Revert
        </Button.Button>
      </div>
      <span data-testid='held.editing'>{editing ? 'editing' : 'preview'}</span>
      <span data-testid='held.value'>{value}</span>
      <span data-testid='held.commits'>{commits.length === 0 ? 'none' : commits.join(' · ')}</span>
    </>
  );
};

/** Held open, the machine never announces a commit, so the hook's `commit` delivers it, exactly once. */
export const TestHeldOpen: Story = {
  render: HeldOpenStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('held.input');

    await userEvent.clear(input);
    await userEvent.type(input, 'Ship the summer release');
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('none');

    canvas.getByTestId('held.commit').click();
    await waitFor(() => expect(canvas.getByTestId('held.value')).toHaveTextContent('Ship the summer release'));
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('Ship the summer release');
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');

    // A revert restores the committed text rather than leaving the abandoned draft.
    await userEvent.clear(input);
    await userEvent.type(input, 'Abandoned');
    canvas.getByTestId('held.revert').click();
    await waitFor(() => expect(canvas.getByTestId('held.input')).toHaveValue('Ship the summer release'));
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');
  },
};

/** The same `commit` on a field the machine owns collapses into the machine's own announcement. */
export const TestUncontrolledCommit: Story = {
  render: HeldOpenStory,
  args: { held: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Opened first: a field at rest reconciles to the host's value, so text typed before editing is discarded.
    canvas.getByTestId('held.edit').click();
    await waitFor(() => expect(canvas.getByTestId('held.editing')).toHaveTextContent('editing'));

    const input = canvas.getByTestId('held.input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Ship the summer release');
    canvas.getByTestId('held.commit').click();

    await waitFor(() => expect(canvas.getByTestId('held.value')).toHaveTextContent('Ship the summer release'));
    await expect(canvas.getByTestId('held.commits')).toHaveTextContent('Ship the summer release');
    await expect(canvas.getByTestId('held.commits').textContent).not.toContain('·');
  },
};
