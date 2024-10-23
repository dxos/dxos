//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

import { ComputeGraphContextProvider } from '../components';
import { createSheet } from '../defs';
import { useComputeGraph, useSheetModel } from '../hooks';
import { withComputeGraphDecorator } from '../testing';
import { SheetType } from '../types';

const Story = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const [sheet, setSheet] = useState<SheetType>();
  const model = useSheetModel(graph, sheet);
  useEffect(() => {
    if (space) {
      const sheet = space.db.add(createSheet());
      setSheet(sheet);
    }
  }, [space]);

  return (
    <SyntaxHighlighter language='json'>
      {JSON.stringify({ space: space?.id, graph: graph?.id, sheet: sheet?.id, model: model?.id }, null, 2)}
    </SyntaxHighlighter>
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-sheet/hooks',
  component: ComputeGraphContextProvider,
  decorators: [
    withClientProvider({ types: [SheetType], createIdentity: true, createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
  ],
  render: (args: any) => <Story {...args} />,
};

export default meta;
