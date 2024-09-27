//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { getSpace, type Space } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Sheet } from './Sheet';
import { type SizeMap } from './grid';
import { useSheetContext } from './sheet-context';
import { addressToIndex, rangeToIndex } from '../../model';
import { useTestSheet, withGraphDecorator } from '../../testing';
import { ValueTypeEnum } from '../../types';
// TODO(wittjosiah): Refactor. This is not exported from ./components due to depending on ECHO.
import { useComputeGraph } from '../ComputeGraph/useComputeGraph';
import { Toolbar, type ToolbarActionHandler } from '../Toolbar';
// TODO(burdon): Allow toolbar to access sheet context; provide state for current cursor/range.
const SheetWithToolbar = ({ debug, space }: { debug?: boolean; space: Space }) => {
  const { model, cursor, range } = useSheetContext();

  // TODO(burdon): Factor out.
  const handleAction: ToolbarActionHandler = ({ type }) => {
    log.info('action', { type, cursor, range });
    if (!cursor) {
      return;
    }

    const idx = range ? rangeToIndex(model.sheet, range) : addressToIndex(model.sheet, cursor);
    model.sheet.formatting[idx] ??= {};
    const format = model.sheet.formatting[idx];

    switch (type) {
      case 'clear': {
        // TODO(burdon): Toggle to show all ranges to allow user to delete range.
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
      case 'comment': {
        break;
      }
    }
  };

  const graph = useComputeGraph(space);
  const handleRefresh = () => {
    graph.refresh();
  };

  return (
    <div className='flex flex-col overflow-hidden'>
      <Toolbar.Root onAction={handleAction}>
        <Toolbar.Styles />
        <Toolbar.Format />
        <Toolbar.Alignment />
        <Toolbar.Separator />
        <Toolbar.Actions />
        <Button onClick={handleRefresh}>Refresh</Button>
      </Toolbar.Root>
      <Sheet.Main />
      {debug && <Sheet.Debug />}
    </div>
  );
};

export default {
  title: 'plugin-sheet/Sheet',
  component: Sheet,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true, classNames: 'inset-4' }), withGraphDecorator],
};

export const Default = () => {
  const [debug, setDebug] = useState(false);
  const sheet = useTestSheet();
  const space = getSpace(sheet);
  if (!sheet || !space) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet} space={space} onInfo={() => setDebug((debug) => !debug)}>
      <SheetWithToolbar debug={debug} space={space} />
    </Sheet.Root>
  );
};

export const Debug = () => {
  const sheet = useTestSheet();
  const space = getSpace(sheet);
  if (!sheet || !space) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet} space={space}>
      <Sheet.Main />
      <Sheet.Debug />
    </Sheet.Root>
  );
};

export const Rows = () => {
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const sheet = useTestSheet();
  const space = getSpace(sheet);
  if (!sheet || !space) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet} space={space}>
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
  const space = getSpace(sheet);
  if (!sheet || !space) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet} space={space}>
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
  const space = getSpace(sheet);
  if (!sheet || !space) {
    return null;
  }

  return (
    <Sheet.Root sheet={sheet} space={space}>
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
      <div className='z-20 absolute inset-0 border border-primary-500 pointer-events-none' />

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
