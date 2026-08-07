//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Editor, type EditorProps } from './Editor';

const MARKDOWN = [
  '# Weekly sync',
  '',
  'Agenda:',
  '',
  '- Review the **card primitives** extraction',
  '- Decide on the provider-plugin split',
  '',
  'See `AUDIT.md` for details.',
].join('\n');

// Controlled wrapper so the story exercises the `value`/`onChange` binding (the message-composer path).
const ControlledStory = ({ value: initial = '', ...props }: EditorProps) => {
  const [value, setValue] = useState(initial);
  return (
    <div className='w-[40rem]'>
      <Editor {...props} classNames='border border-separator rounded min-h-[12lh]' value={value} onChange={setValue} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Editor',
  render: ControlledStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof ControlledStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Write your message…', value: 'Hi there,\n\nThanks for the update — looks good to me.' },
};

export const Markdown: Story = {
  args: { markdown: true, lineWrapping: true, value: MARKDOWN },
};

export const Plain: Story = {
  args: { markdown: false, value: MARKDOWN },
};

export const Compact: Story = {
  args: { compact: true, placeholder: 'Message…' },
};
