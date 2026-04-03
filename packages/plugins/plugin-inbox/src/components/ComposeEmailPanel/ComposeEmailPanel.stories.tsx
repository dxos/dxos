//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '../../translations';

import { ComposeEmailPanel, type ComposeEmailPanelProps } from './ComposeEmailPanel';

type DefaultStoryProps = Pick<ComposeEmailPanelProps, 'onSend'>;

const createInMemoryDraft = () =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { name: 'Me' },
    blocks: [{ _tag: 'text' as const, text: '' }],
    properties: {
      to: '',
      subject: '',
    },
  });

const DefaultStory = (args: DefaultStoryProps) => {
  const draft = useMemo(createInMemoryDraft, []);
  return <ComposeEmailPanel draft={draft} onSend={args.onSend} />;
};

const meta = {
  title: 'plugins/plugin-inbox/components/ComposeEmailPanel',
  component: ComposeEmailPanel as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSend: async (message: any) => console.log(message),
  },
};

export const Spec: Story = {
  args: {
    onSend: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the form to render.
    await canvas.findByTestId('compose-email-form');

    // Fill in the form fields.
    const toInput = canvas.getByLabelText('To');
    await userEvent.type(toInput, 'test@example.com');

    const subjectInput = canvas.getByLabelText('Subject');
    await userEvent.type(subjectInput, 'Test Subject');

    const bodyInput = canvas.getByLabelText('Body');
    await userEvent.type(bodyInput, 'Hello, this is a test email.');

    // Click the send button.
    const sendButton = canvas.getByTestId('save-button');
    await userEvent.click(sendButton);

    // Assert onSend was called.
    await expect(args.onSend).toHaveBeenCalled();

    // Verify the draft was updated with our values.
    const draft = args.onSend!.mock.calls[0][0];
    await expect(draft.properties.to).toBe('test@example.com');
    await expect(draft.properties.subject).toBe('Test Subject');
    const textBlock = draft.blocks.find((block: any) => block._tag === 'text');
    await expect(textBlock?.text).toBe('Hello, this is a test email.');
  },
};
