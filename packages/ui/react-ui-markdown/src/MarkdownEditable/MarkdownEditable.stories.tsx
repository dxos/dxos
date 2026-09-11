//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type EditableActivation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MarkdownEditable } from './MarkdownEditable.tsx';

type StoryArgs = {
  initialValue?: string;
  placeholder?: string;
  activation?: EditableActivation;
  readonly?: boolean;
  multiline?: boolean;
  editing?: boolean;
};

// Long enough to overflow the story's 28rem field, so wrapping is visible rather than asserted alone.
const PARAGRAPH =
  'Target a 12 minute development window; log every profile so the next batch can be reproduced without guessing at the drop temperature.';

const DefaultStory = ({
  initialValue = 'Two Ethiopian lots, sampled before committing. See https://example.com/suppliers.',
  placeholder = 'Add a description',
  activation,
  readonly,
  multiline,
  editing,
}: StoryArgs) => {
  const [value, setValue] = useState(initialValue);
  const [commits, setCommits] = useState(0);

  return (
    <div className='flex flex-col gap-4 min-w-[28rem]'>
      <MarkdownEditable
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setCommits((count) => count + 1);
        }}
        placeholder={placeholder}
        activation={activation}
        readonly={readonly}
        multiline={multiline}
        editing={editing}
      />
      <div className='text-sm text-description' data-testid='markdownEditable.commits'>
        {`Commits: ${commits}`}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-markdown/MarkdownEditable',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DoubleClick: Story = {
  args: { activation: 'dblclick' },
};

export const Empty: Story = {
  args: { initialValue: '' },
};

export const Readonly: Story = {
  args: { readonly: true },
};

// A description pane: the editor is held open rather than clicked into, and Enter is a newline.
export const Multiline: Story = {
  args: { initialValue: PARAGRAPH, multiline: true, editing: true },
};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // At rest the markdown is rendered, not shown as source: a bare URL is an anchor.
    const preview = canvas.getByTestId('markdownEditable.preview');
    await expect(preview.querySelector('a')).not.toBeNull();

    // Clicking swaps in the editor, which holds the SOURCE the preview was rendered from.
    await userEvent.click(preview);
    const editor = await canvas.findByTestId('markdownEditable.editor');
    await waitFor(async () => expect(editor.querySelector('.cm-content')).not.toBeNull());
    await expect(editor.textContent).toContain('https://example.com/suppliers');
    await expect(canvas.queryByTestId('markdownEditable.preview')).toBeNull();
  },
};

export const TestMultiline: Story = {
  args: { initialValue: PARAGRAPH, multiline: true, editing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('markdownEditable.editor');
    const content = await waitFor(async () => {
      const found = editor.querySelector('.cm-content');
      await expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    // The paragraph wraps to the field's width rather than scrolling off the side, which is what
    // the markdown bundle alone does — it is `white-space: pre` without the basic extensions.
    await waitFor(async () => expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth + 1));
    // A wrapped line is still ONE `.cm-line`, so the wrap shows up as height rather than line count:
    // the field is taller than the single row it would be if the text ran off the side.
    const singleRow = parseFloat(getComputedStyle(content).lineHeight);
    await expect(content.getBoundingClientRect().height).toBeGreaterThan(singleRow * 1.5);

    // ...and Enter opens a line here instead of committing, since leaving the field is what commits.
    await userEvent.click(content);
    await userEvent.keyboard('{Enter}second line');
    await waitFor(async () => expect(editor.querySelectorAll('.cm-line').length).toEqual(2));
    await expect(editor.textContent).toContain('second line');
    await expect(canvas.getByTestId('markdownEditable.commits').textContent).toEqual('Commits: 0');
  },
};

export const TestReadonly: Story = {
  args: { readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('markdownEditable.preview'));
    // A read-only field has no way in, so the editor never appears.
    await expect(canvas.queryByTestId('markdownEditable.editor')).toBeNull();
  },
};
