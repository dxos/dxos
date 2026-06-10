//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Ref } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { Transcript } from './Transcript';

// Inline format: `[m:ss](url?t=s) >> Speaker text` — timestamp → gutter, `>>` → speaker widget, text inline.
const SAMPLE_TRANSCRIPT = [
  '[0:02](https://youtu.be/dQw4w9WgXcQ?t=2) >> Welcome everyone to the show.',
  '[0:15](https://youtu.be/dQw4w9WgXcQ?t=15) >> Thanks for having me, glad to be here.',
  "[1:46](https://youtu.be/dQw4w9WgXcQ?t=106) >> So what if you had the plural aversion? The singularities are here, meaning there's many curves going up and to the right very fast.",
  '[2:30](https://youtu.be/dQw4w9WgXcQ?t=150) >> Let me show you the solar singularity: in Africa, solar power is just absolutely mooning.',
].join('\n');

type DefaultStoryProps = { content: string };

const DefaultStory = ({ content }: DefaultStoryProps) => {
  const client = useClient();
  const [text] = useState(() => client.spaces.get()[0].db.add(Text.make({ content })));
  return (
    <Transcript
      classNames='dx-document bg-base-surface'
      id={text.id}
      source={Ref.make(text)}
      onSeek={(seconds) => console.log('[seek]', seconds)}
    />
  );
};

const meta = {
  title: 'plugins/plugin-video/components/Transcript',
  component: Transcript as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({ types: [Text.Text], createIdentity: true, createSpace: true }),
  ],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { content: SAMPLE_TRANSCRIPT },
};

export const Empty: Story = {
  args: { content: '' },
};
