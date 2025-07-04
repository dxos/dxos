//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { mermaid } from './mermaid';

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
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        // TODO(burdon): Bug if mermaid extension is provided after decorateMarkdown.
        mermaid(),
        decorateMarkdown(),
      ],
    }),
    [themeMode],
  );

  return <div className='w-[50rem]' ref={parentRef} {...focusAttributes} />;
};

export const Default = {
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

export const Error = {
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

const meta: Meta = {
  title: 'plugins/plugin-mermaid/extensions',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
};

export default meta;
