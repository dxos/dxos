//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentId,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withTheme, withLayout } from '@dxos/storybook-utils';
import { nonNullable } from '@dxos/util';

import { compute, computeGraphFacet } from './compute';
import { GridSheet, SheetProvider, useComputeGraph } from '../components';
import { useSheetModel } from '../model';
import { useTestSheet, withComputeGraphDecorator } from '../testing';
import { SheetType } from '../types';

const str = (...lines: string[]) => lines.join('\n');

type EditorProps = {
  text?: string;
};

// TODO(burdon): Implement named expressions.
//  https://hyperformula.handsontable.com/guide/cell-references.html

// TODO(burdon): Inline Adobe eCharts.

const SHEET_NAME = 'Test Sheet';

const EditorStory = ({ text }: EditorProps) => {
  const id = useMemo(() => PublicKey.random(), []);
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const computeGraph = useComputeGraph(space);
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        documentId.of(id.toHex()),
        computeGraph && computeGraphFacet.of(computeGraph),
        compute(),
        decorateMarkdown(),
      ].filter(nonNullable),
    }),
    [computeGraph, themeMode],
  );

  return <div className='w-[40rem] overflow-hidden' ref={parentRef} {...focusAttributes} />;
};

const Grid = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { name: SHEET_NAME });
  const model = useSheetModel(graph, sheet);
  useEffect(() => {
    if (model) {
      model.setValues({ A1: { value: 100 }, A2: { value: 200 }, A3: { value: 300 }, A5: { value: '=SUM(A1:A3)' } });
    }
  }, [model]);

  if (!graph || !sheet) {
    return null;
  }

  return (
    <div className='flex w-[40rem] overflow-hidden'>
      <SheetProvider graph={graph} sheet={sheet}>
        <GridSheet />
      </SheetProvider>
    </div>
  );
};

const GraphStory = (props: EditorProps) => {
  return (
    <div className='grid grid-rows-2'>
      <EditorStory {...props} />
      <Grid />
    </div>
  );
};

// TODO(burdon): Inline formulae.
export const Default = {
  render: EditorStory,
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
  render: GraphStory,
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
      '',
    ),
  },
};

const meta: Meta = {
  title: 'plugins/plugin-sheet/extensions',
  decorators: [
    withClientProvider({ types: [SheetType], createIdentity: true, createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
