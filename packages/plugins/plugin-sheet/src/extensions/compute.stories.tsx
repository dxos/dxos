//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { PublicKey } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentId,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { isNonNullable } from '@dxos/util';

import { GridSheet, SheetProvider, useComputeGraph } from '../components';
import { useSheetModel } from '../model';
import { useTestSheet, withComputeGraphDecorator } from '../testing';
import { Sheet } from '../types';

import { compute, computeGraphFacet } from './compute';

const str = (...lines: string[]) => lines.join('\n');

type EditorProps = {
  text?: string;
};

// TODO(burdon): Implement named expressions.
//  https://hyperformula.handsontable.com/guide/cell-references.html

// TODO(burdon): Inline Adobe eCharts.

const SHEET_NAME = 'Test Sheet';

const DefaultStory = ({ text }: EditorProps) => {
  const id = useMemo(() => PublicKey.random(), []);
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const computeGraph = useComputeGraph(space);
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        documentId.of(id.toHex()),
        computeGraph && computeGraphFacet.of(computeGraph),
        compute(),
        decorateMarkdown(),
      ].filter(isNonNullable),
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
      <DefaultStory {...props} />
      <Grid />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/extensions',
  decorators: [
    withTheme,
    withClientProvider({ types: [Sheet.Sheet], createIdentity: true, createSpace: true }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [IntentPlugin()] }),
    withComputeGraphDecorator(),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

// TODO(burdon): Inline formulae.
export const Default: StoryObj<typeof DefaultStory> = {
  render: DefaultStory,
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

export const Graph: StoryObj<typeof GraphStory> = {
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
