//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

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

import { compute } from './compute';
import { withGraphDecorator } from '../testing';

// import { useComputeGraph } from '../components';

const str = (...lines: string[]) => lines.join('\n');

type StoryProps = {
  text?: string;
};

const Story = ({ text }: StoryProps) => {
  const { themeMode } = useThemeContext();
  // const graph = useComputeGraph();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        compute(),
        decorateMarkdown(),
      ],
    }),
    [themeMode],
  );

  return <div className='w-[800px]' ref={parentRef} {...focusAttributes} />;
};

export default {
  title: 'plugin-sheet/extensions',
  decorators: [withGraphDecorator, withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
  render: Story,
};

export const Mermaid = {
  args: {
    text: str('# Compute', '', '```dx', '=FOO()', '```', ''),
  },
};
