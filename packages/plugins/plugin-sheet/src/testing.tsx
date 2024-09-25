//
// Copyright 2024 DXOS.org
//

import type { Decorator } from '@storybook/react';
import React, { useContext, useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { type EchoReactiveObject } from '@dxos/echo-schema';

import { type ComputeGraph, createComputeGraph } from './components';
import { ComputeGraphContext, ComputeGraphContextProvider } from './components/ComputeGraph/graph-context';
import { SheetModel } from './model';
import { createSheet, type CellValue, SheetType } from './types';

export const testSheetName = 'test';

export const createCells = (): Record<string, CellValue> => ({
  B1: { value: 'Qty' },
  B3: { value: 1 },
  B4: { value: 2 },
  B5: { value: 3 },
  B7: { value: 'Total' },

  C1: { value: 'Price' },
  C3: { value: 2_000 },
  C4: { value: 2_500 },
  C5: { value: 3_000 },
  C7: { value: '=SUMPRODUCT(B2:B6, C2:C6)' },
  // C8: { value: '=C7*CRYPTO(D7)' },
  C8: { value: '=C7*TEST()' },

  D7: { value: 'USD' },
  D8: { value: 'BTC' },

  E3: { value: '=TODAY()' },
  E4: { value: '=NOW()' },

  F1: { value: `=${testSheetName}!A1` }, // Ref test sheet.
  F3: { value: true },
  F4: { value: false },
  F5: { value: '8%' },
  F6: { value: '$10000' },
});

export const createTestSheet = async ({
  name,
  graph = createComputeGraph(),
}: { name?: string; graph?: ComputeGraph } = {}) => {
  const sheet = createSheet(name);
  const model = new SheetModel(graph, sheet);
  await model.initialize();
  model.setValues(createCells());
  model.sheet.columnMeta[model.sheet.columns[0]] = { size: 100 };
  await model.destroy();
  return sheet;
};

export const useTestSheet = () => {
  const { graphs, setGraph } = useContext(ComputeGraphContext);
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    const t = setTimeout(async () => {
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      const graph = graphs[space.id] ?? createComputeGraph();
      if (!graphs[space.id]) {
        setGraph(space.id, graph);
      }

      const sheet = await createTestSheet({ graph });
      space.db.add(sheet);
      setSheet(sheet);
    });

    return () => clearTimeout(t);
  }, []);

  return sheet;
};

export const withGraphDecorator: Decorator = (Story) => {
  const [graphs, setGraphs] = useState<Record<string, ComputeGraph>>({});

  const setGraph = (key: string, graph: ComputeGraph) => {
    if (!graph.hf.doesSheetExist(testSheetName)) {
      const sheetName = graph.hf.addSheet(testSheetName);
      const sheet = graph.hf.getSheetId(sheetName)!;
      graph.hf.setCellContents({ sheet, col: 0, row: 0 }, Math.random());
    }

    setGraphs((graphs) => ({ ...graphs, [key]: graph }));
  };

  return (
    <ComputeGraphContextProvider graphs={graphs} setGraph={setGraph}>
      <Story />
    </ComputeGraphContextProvider>
  );
};
