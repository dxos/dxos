//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import React, { useEffect, useState } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withTheme, withLayout } from '@dxos/storybook-utils';
import { nonNullable } from '@dxos/util';

import { compute } from './compute';
import { type ComputeCell } from '../graph';
import { useComputeGraph } from '../hooks';
import { withGraphDecorator } from '../testing';

const str = (...lines: string[]) => lines.join('\n');

type StoryProps = {
  text?: string;
};

const Story = ({ text }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const graph = useComputeGraph(space);
  const [cell, setCell] = useState<ComputeCell>();
  useEffect(() => {
    if (graph) {
      const cell = graph.getCell('test');
      setCell(cell);
    }
  }, [graph]);
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        cell && compute(cell),
        decorateMarkdown(),
      ].filter(nonNullable),
    }),
    [cell, themeMode],
  );

  return <div className='w-[40rem]' ref={parentRef} {...focusAttributes} />;
};

export default {
  title: 'plugin-sheet/extensions',
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withGraphDecorator,
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
  render: Story,
};

export const Default = {
  args: {
    text: str(
      '# Compute',
      '',
      'This is a compute expression:',
      '',
      '```dx',
      '=SUM(1, 2)',
      '```',
      '',
      'It should change in realtime.',
      '',
      '```dx',
      '=SUM(3, 5)',
      '```',
      '',
      '',
    ),
  },
};
