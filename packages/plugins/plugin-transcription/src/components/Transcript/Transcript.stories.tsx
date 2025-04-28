//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo } from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { hues, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import { transcript, TranscriptModel } from './transcript-extension';
import translations from '../../translations';
import { type TranscriptBlock } from '../../types';

let start = new Date(Date.now() - 24 * 60 * 60 * 10_000);
const next = () => {
  start = new Date(start.getTime() + Math.random() * 10_000);
  return start;
};

const users = Array.from({ length: 5 }, () => ({
  authorName: faker.person.fullName(),
  authorHue: faker.helpers.arrayElement(hues),
}));

const createBlock = (): TranscriptBlock => {
  const author = faker.helpers.arrayElement(users);
  return {
    id: ObjectId.random().toString(),
    ...author,
    segments: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
      started: next(),
      text: faker.lorem.paragraph(),
    })),
  };
};

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: ({ blocks: initialBlocks = [], ...args }) => {
    const [blocks, setBlocks] = useState(initialBlocks);
    useEffect(() => {
      const i = setInterval(() => {
        setBlocks((blocks) => [...blocks, createBlock()]);
      }, 1_000);

      return () => clearInterval(i);
    }, []);

    return <Transcript {...args} blocks={blocks} />;
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
    }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Transcript>;

export const Default: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    blocks: Array.from({ length: 10 }, createBlock),
  },
};

export const Empty: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};

const ExtensionStory = () => {
  const { themeMode } = useThemeContext();
  const blocks = useMemo(() => Array.from({ length: 100 }, createBlock), []);
  const model = useMemo(
    () => new TranscriptModel(blocks.flatMap((block) => block.segments.map((segment) => segment.text))),
    [blocks],
  );

  const { parentRef } = useTextEditor({
    doc: model,
    extensions: [
      createBasicExtensions(),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode }),
      decorateMarkdown(),
      transcript({
        model,
      }),
    ],
  });

  return <div ref={parentRef} className={mx('w-full', editorWidth)} />;
};

export const Extension: Story = {
  render: () => <ExtensionStory />,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
