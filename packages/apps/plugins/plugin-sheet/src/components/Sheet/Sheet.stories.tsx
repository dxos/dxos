//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { type Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Sheet } from './Sheet';
import { type SizeMap } from './grid';
import { useSheetContext } from './sheet-context';
import { SheetModel } from '../../model';
import { ValueTypeEnum, type CellValue, createSheet, SheetType } from '../../types';
import { ComputeGraphContextProvider, createComputeGraph, useComputeGraph } from '../ComputeGraph';
import { Toolbar, type ToolbarActionHandler } from '../Toolbar';

// TODO(burdon): Allow toolbar to access sheet context; provide state for current cursor/range.
const SheetWithToolbar = ({ debug }: { debug?: boolean }) => {
  const { model, cursor, range } = useSheetContext();

  // TODO(burdon): Factor out.
  const handleAction: ToolbarActionHandler = ({ type }) => {
    log.info('action', { type, cursor, range });
    if (!cursor) {
      return;
    }

    const idx = range ? model.rangeToIndex(range) : model.addressToIndex(cursor);

    // TODO(burdon): Fix ??=.
    let format = model.sheet.formatting[idx];
    if (!format) {
      model.sheet.formatting[idx] = {};
      format = model.sheet.formatting[idx];
    }

    switch (type) {
      case 'clear': {
        // TODO(burdon): How to clear ranges? Option to view all ranges and select/delete/update?
        format.classNames = [];
        break;
      }
      case 'highlight': {
        // TODO(burdon): Util to add to set.
        format.classNames = ['bg-green-300 dark:bg-green-700'];
        break;
      }

      case 'left': {
        format.classNames = ['text-left'];
        break;
      }
      case 'center': {
        format.classNames = ['text-center'];
        break;
      }
      case 'right': {
        format.classNames = ['text-right'];
        break;
      }

      case 'date': {
        format.type = ValueTypeEnum.Date;
        format.format = 'YYYY-MM-DD';
        break;
      }
      case 'currency': {
        format.type = ValueTypeEnum.Currency;
        format.precision = 2;
        break;
      }
    }
  };

  return (
    <div className='flex flex-col overflow-hidden'>
      <Toolbar.Root onAction={handleAction}>
        <Toolbar.Styles />
        <Toolbar.Format />
        <Toolbar.Alignment />
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <Sheet.Main />
      {debug && <Sheet.Debug />}
    </div>
  );
};

const testSheetName = 'test';

const withGraphDecorator: Decorator = (Story) => {
  const [graph] = useState(() => createComputeGraph());
  useEffect(() => {
    if (!graph.hf.doesSheetExist(testSheetName)) {
      const sheetName = graph.hf.addSheet(testSheetName);
      const sheet = graph.hf.getSheetId(sheetName)!;
      graph.hf.setCellContents({ sheet, col: 0, row: 0 }, Math.random());
    }
  }, [graph]);

  return (
    <ComputeGraphContextProvider graph={graph}>
      <Story />
    </ComputeGraphContextProvider>
  );
};

export default {
  title: 'plugin-sheet/Sheet',
  component: Sheet,
  decorators: [withGraphDecorator, withTheme, withFullscreen({ classNames: 'inset-4' })],
};

export const Default = () => {
  const [debug, setDebug] = useState(false);
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Sheet.Root sheet={sheet} onInfo={() => setDebug((debug) => !debug)}>
        <SheetWithToolbar debug={debug} />
      </Sheet.Root>
    </Tooltip.Provider>
  );
};

export const Debug = () => {
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet}>
      <Sheet.Main />
      <Sheet.Debug />
    </Sheet.Root>
  );
};

export const Rows = () => {
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet}>
      <Sheet.Rows
        rows={sheet.rows}
        sizes={rowSizes}
        onResize={(id, size) => setRowSizes((sizes) => ({ ...sizes, [id]: size }))}
      />
    </Sheet.Root>
  );
};

export const Columns = () => {
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet}>
      <Sheet.Columns
        columns={sheet.columns}
        sizes={columnSizes}
        onResize={(id, size) => setColumnSizes((sizes) => ({ ...sizes, [id]: size }))}
      />
    </Sheet.Root>
  );
};

export const Main = () => {
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet}>
      <Sheet.Grid
        size={{
          numRows: 50,
          numColumns: 26,
        }}
        rows={sheet.rows}
        columns={sheet.columns}
        rowSizes={{}}
        columnSizes={{}}
      />
    </Sheet.Root>
  );
};

/**
 * Scrolling container with fixed border that overlaps the border of inner elements.
 */
export const ScrollLayout = () => {
  return (
    <div className='relative flex grow overflow-hidden'>
      {/* Fixed border. */}
      <div className='z-10 absolute inset-0 border border-primary-500 pointer-events-none' />

      {/* Scroll container. */}
      <div className='grow overflow-auto scrollbar-thin'>
        {/* Scroll content. */}
        <div className='relative w-[2000px] h-[2000px]'>
          <Cell label='A1' className='absolute left-0 top-0 w-20 h-20' />
          <Cell label='A1' className='absolute right-0 top-0 w-20 h-20' />
          <Cell label='A1' className='absolute left-0 bottom-0 w-20 h-20' />
          <Cell label='A1' className='absolute right-0 bottom-0 w-20 h-20' />
        </div>
      </div>
    </div>
  );
};

export const GridLayout = () => {
  return (
    <div className='grid grid-cols-[40px_1fr_40px] grid-rows-[40px_1fr_40px] grow'>
      <Cell label='A1' />
      <Cell label='B1' />
      <Cell label='C1' />
      <Cell label='A2' />
      <Cell label='B2' />
      <Cell label='C2' />
      <Cell label='A3' />
      <Cell label='B3' />
      <Cell label='C3' />
    </div>
  );
};

const Cell = ({ className, label }: { className?: string; label: string }) => (
  <div className={mx('flex items-center justify-center border', className)}>{label}</div>
);

const createCells = (): Record<string, CellValue> => ({
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

  F1: { value: `=${testSheetName}}!A1` }, // Ref test sheet.
  F3: { value: true },
  F4: { value: false },
  F5: { value: '8%' },
  F6: { value: '$10000' },
});

const useTestSheet = () => {
  const graph = useComputeGraph();
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    const t = setTimeout(async () => {
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      const sheet = createSheet();
      const model = new SheetModel(graph, sheet);
      await model.initialize();
      model.setValues(createCells());
      model.sheet.columnMeta[model.sheet.columns[0]] = { size: 100 };
      await model.destroy();

      space.db.add(sheet);
      setSheet(sheet);
    });

    return () => clearTimeout(t);
  }, []);

  return sheet;
};
