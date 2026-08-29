//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type EditableActivation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MarkdownEditable } from './MarkdownEditable';

type StoryArgs = {
  initialValue?: string;
  placeholder?: string;
  activation?: EditableActivation;
  readonly?: boolean;
};

const DefaultStory = ({
  initialValue = 'Two Ethiopian lots, sampled before committing. See https://example.com/suppliers.',
  placeholder = 'Add a description',
  activation,
  readonly,
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

export const TestReadonly: Story = {
  args: { readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('markdownEditable.preview'));
    // A read-only field has no way in, so the editor never appears.
    await expect(canvas.queryByTestId('markdownEditable.editor')).toBeNull();
  },
};
