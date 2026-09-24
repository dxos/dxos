//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { type MermaidOptions, mermaid } from './mermaid-extension.ts';

type StoryArgs = MermaidOptions & {
  text?: string;
};

const DefaultStory = ({ text, ...options }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        mermaid(options),
        decorateMarkdown(),
      ],
    }),
    [themeMode, options.theme, options.themeCSS],
  );

  return <div {...focusAttributes} ref={parentRef} />;
};

const meta = {
  title: 'plugins/plugin-mermaid/extensions/mermaid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  argTypes: {
    theme: { control: 'select', options: ['default', 'neutral', 'dark', 'forest', 'base'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: [
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
    ].join('\n'),
  },
};

/** A sequence diagram, whose selectors differ from the flowchart's, under the same tokens. */
export const Sequence: Story = {
  args: {
    text: [
      '# Sequence',
      '',
      '```mermaid',
      'sequenceDiagram',
      '  participant Client',
      '  participant Edge',
      '  Client->>Edge: request',
      '  Edge-->>Client: response',
      '```',
      '',
    ].join('\n'),
  },
};

/** The `base` theme with our own `themeCSS` only, no built-in palette underneath. */
export const Base: Story = {
  args: {
    ...Default.args,
    theme: 'base',
  },
};

export const Error: Story = {
  args: {
    text: [
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
    ].join('\n'),
  },
};
