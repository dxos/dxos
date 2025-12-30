//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { mermaid } from './mermaid-extension';

const str = (...lines: string[]) => lines.join('\n');

type StoryProps = {
  text?: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        mermaid(),
        decorateMarkdown(),
      ],
    }),
    [themeMode],
  );

  return <div className='is-[50rem]' ref={parentRef} {...focusAttributes} />;
};

const meta = {
  title: 'plugins/plugin-mermaid/extensions',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: str(
      '# Mermaid',
      '',
      'This is a mermaid diagram:',
      '',
      '```mermaid',
      'graph LR;',
      'A-->B;',
      'B-->C;',
      'B-->D;',
      'B-->E;',
      'D-->E;',
      'C-->D;',
      '```',
      '',
      'Inside a markdown document.',
      '',
    ),
  },
};

export const Error: Story = {
  args: {
    text: str(
      '# Mermaid',
      '',
      'This is a broken mermaid diagram:',
      '',
      '```mermaid',
      'graph TD;',
      'A- ->B;',
      '```',
      '',
      '',
      '',
    ),
  },
};
