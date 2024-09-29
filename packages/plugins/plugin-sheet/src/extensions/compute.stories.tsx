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
import { Sheet } from '../components';
import { type ComputeNode } from '../graph';
import { useComputeGraph, useSheetModel } from '../hooks';
import { useTestSheet, withGraphDecorator } from '../testing';
import { SheetType } from '../types';

const str = (...lines: string[]) => lines.join('\n');

type EditorProps = {
  text?: string;
};

// TODO(burdon): Implement named expressions.
//  https://hyperformula.handsontable.com/guide/cell-references.html

const DOC_NAME = 'Test Doc';
const SHEET_NAME = 'Test Sheet';

const Editor = ({ text }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const graph = useComputeGraph(space);
  const [node, setNode] = useState<ComputeNode>();
  // TODO(burdon): Virtualize SheetModel.
  useEffect(() => {
    if (graph) {
      setNode(graph.getOrCreateNode(DOC_NAME));
    }
  }, [graph]);
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        node && compute(node),
        decorateMarkdown(),
      ].filter(nonNullable),
    }),
    [node, themeMode],
  );

  return <div className='w-[40rem] overflow-hidden' ref={parentRef} {...focusAttributes} />;
};

const Grid = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { title: SHEET_NAME });
  const model = useSheetModel(space, sheet);
  useEffect(() => {
    if (model) {
      model.setValues({ A1: { value: 100 }, A2: { value: 200 }, A3: { value: 300 }, A5: { value: '=SUM(A1:A3)' } });
    }
  }, [model]);

  if (!space || !sheet) {
    return null;
  }

  return (
    <div className='flex w-[40rem] overflow-hidden'>
      <Sheet.Root space={space} sheet={sheet}>
        <Sheet.Main classNames='border border-separator' />
      </Sheet.Root>
    </div>
  );
};

const Story = (props: EditorProps) => {
  return (
    <div className='grid grid-rows-2'>
      <Editor {...props} />
      <Grid />
    </div>
  );
};

export default {
  title: 'plugin-sheet/extensions',
  decorators: [
    withClientProvider({ types: [SheetType], createIdentity: true, createSpace: true }),
    withGraphDecorator,
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: Editor,
  args: {
    text: str(
      //
      '# Compute Graph',
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

export const Graph = {
  render: Story,
  args: {
    text: str(
      //
      '# Compute Graph',
      '',
      'The total projected cost is:',
      '',
      '```dx',
      `="${SHEET_NAME}"!A5`,
      '```',
      '',
    ),
  },
};
