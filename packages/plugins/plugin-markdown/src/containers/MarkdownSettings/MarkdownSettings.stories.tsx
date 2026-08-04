//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Markdown } from '#types';

import { MarkdownSettings } from './MarkdownSettings';

type StoryProps = {
  settings: Markdown.Settings;
};

// The container reads and writes the contributed settings entry, so the story owns one per render.
const DefaultStory = ({ settings }: StoryProps) => {
  const subject = useMemo(
    () => ({
      prefix: pluginMeta.profile.key,
      schema: Markdown.Settings,
      atom: Atom.make<Markdown.Settings>(settings).pipe(Atom.keepAlive),
    }),
    [settings],
  );

  return <MarkdownSettings subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-markdown/containers/MarkdownSettings',
  tags: ['settings'],
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      defaultViewMode: 'preview',
      editorInputMode: 'default',
      toolbar: true,
      numberedHeadings: false,
      folding: false,
      experimental: false,
      debug: false,
    },
  },
};
