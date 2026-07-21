//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { createMessages, getStoryMetadata } from '../testing';
import { Thread } from '../Thread';
import { Message } from './Message';

type StoryArgs = { editable: boolean };

// Sample messages are authored by 'did:key:alice'; the local identity matches,
// so `editable` toggles whether the author's own message shows the edit affordance.
const DefaultStory = ({ editable }: StoryArgs) => {
  const [message] = useMemo(() => createMessages(1), []);
  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      identityDid='did:key:alice'
      editable={editable}
      onMessageDelete={() => {}}
    >
      <Message.Tile message={message} />
    </Thread.Root>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Message',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'border w-card-min-width' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Editable: Story = {
  args: {
    editable: true,
  },
};

export const NonEditable: Story = {
  args: {
    editable: false,
  },
};

/**
 * A message carrying a `change` content-block — the reusable tile for a document suggestion (struck
 * original → proposed text) with Accept/Reject controls, driven by `onAcceptChange`/`onRejectChange`.
 */
const onAcceptChange = fn();
const onRejectChange = fn();

const ChangeStory = (_args: StoryArgs) => {
  const message = useMemo(
    () =>
      Obj.make(MessageType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user', identityDid: 'did:key:alice', name: 'Alice' },
        blocks: [{ _tag: 'change', before: 'quick brown fox', after: 'nimble auburn fox' }],
      }),
    [],
  );
  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      identityDid='did:key:alice'
      onAcceptChange={onAcceptChange}
      onRejectChange={onRejectChange}
    >
      <Message.Tile message={message} />
    </Thread.Root>
  );
};

export const WithChange: Story = {
  args: { editable: false },
  render: ChangeStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onAcceptChange.mockClear();
    onRejectChange.mockClear();

    // The change block shows both the struck original and the proposed replacement.
    await canvas.findByText('quick brown fox');
    await canvas.findByText('nimble auburn fox');

    // Accept then reject fire the respective callbacks.
    await userEvent.click(await canvas.findByTestId('thread.message.accept-change'));
    await waitFor(() => expect(onAcceptChange).toHaveBeenCalledTimes(1));
    await userEvent.click(await canvas.findByTestId('thread.message.reject-change'));
    await waitFor(() => expect(onRejectChange).toHaveBeenCalledTimes(1));
  },
};
