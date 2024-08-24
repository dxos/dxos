//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Sheet, type SizeMap } from './Sheet';
import { SheetModel } from '../../model';
import { type CellValue, createSheet, SheetType } from '../../types';
import { Toolbar } from '../Toolbar';

export default {
  title: 'plugin-sheet/Sheet',
  component: Sheet,
  decorators: [withTheme, withFullscreen({ classNames: 'inset-8 ' })],
};

export const Default = () => {
  // TODO(burdon): In general support undefined objects so that the UX can render something while loading?
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <div className='flex flex-col overflow-hidden'>
        <Sheet.Root sheet={sheet}>
          <Toolbar.Root
            onAction={({ type }) => {
              log.info('action', { type });
            }}
          >
            <Toolbar.Styles />
            <Toolbar.Alignment />
          </Toolbar.Root>
          <div className='flex grow overflow-hidden'>
            <Sheet.Main />
          </div>
        </Sheet.Root>
      </div>
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
        bounds={{
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
});

const useTestSheet = () => {
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    const t = setTimeout(async () => {
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      const sheet = createSheet();
      const model = new SheetModel(sheet).initialize();
      model.setValues(createCells());
      space.db.add(sheet);
      setSheet(sheet);
    });

    return () => clearTimeout(t);
  }, []);

  return sheet;
};
