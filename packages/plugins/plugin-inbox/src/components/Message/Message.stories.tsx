//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';
import { InboxCapabilities, Settings } from '#types';

import { Message } from './Message';
import EMAIL from './testing/email.md?raw';

type DefaultStoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: DefaultStoryProps) => {
  const message = useMemo(
    () =>
      MessageType.make({
        sender: {
          name: random.person.fullName(),
          email: random.internet.email(),
        },
        blocks: [{ _tag: 'text', text: text ?? random.lorem.paragraph(2) }],
      }),
    [text],
  );

  return (
    <Message.Root message={message} sender={undefined}>
      <Message.Toolbar />
      <Message.Viewport>
        <Message.Header />
        <Message.Body />
      </Message.Viewport>
    </Message.Root>
  );
};

// Plugin that contributes the inbox Settings capability with remote-image loading enabled
// so the editor's image extension actually renders <img> tags (otherwise the markdown is
// left as plain text and we can't observe the tracking-pixel collapse).
const RemoteImagesEnabledPlugin = Plugin.define({
  id: 'story.inbox-settings',
  name: 'Story Inbox Settings',
}).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: () =>
      Effect.succeed(
        Capability.contributes(InboxCapabilities.Settings, Atom.make<Settings.Settings>({ loadRemoteImages: true })),
      ),
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-inbox/components/Message',
  component: DefaultStory,
  decorators: [
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [RemoteImagesEnabledPlugin()],
    }),
    withTheme(),
    withLayout({ layout: 'column' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Email: Story = {
  args: {
    text: EMAIL,
  },
};

// Verifies images outside the initial parse range still render as widgets when scrolled into
// view (without requiring the user to focus the editor). The image is placed after a long
// stretch of filler text so it falls outside the initial viewport.
export const ImageBelowFold: Story = {
  args: {
    text: [
      'Top of the message.',
      ...Array.from({ length: 80 }, (_, i) => `\nParagraph ${i + 1}: ${random.lorem.paragraph(1)}`),
      '',
      '![](https://picsum.photos/seed/scroll/400/200)',
      '',
      'Bottom of the message.',
    ].join('\n'),
  },
};

// Verifies that 1×1 tracking pixels and the surrounding paragraph-break blank lines collapse
// to nothing. Without the fix you'd see 3 blank lines where the image source lives.
export const TrackingPixel: Story = {
  args: {
    text: [
      'Hello,',
      '',
      'This is the visible body of the email.',
      '',
      '![](https://www.google-analytics.com/__utm.gif)',
      '',
      'Cheers.',
    ].join('\n'),
  },
};
