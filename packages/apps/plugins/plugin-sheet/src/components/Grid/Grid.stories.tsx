//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import type { EchoReactiveObject } from '@dxos/echo-schema';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Grid, type SizeMap } from './Grid';
import { SheetModel } from '../../model';
import { type CellValue, createSheet, SheetType } from '../../types';

export default {
  title: 'plugin-sheet/Grid',
  component: Grid,
  decorators: [withTheme, withFullscreen()],
};

const createCells = (): Record<string, CellValue> => ({
  A7: { value: 'Total' },
  B1: { value: 'Jan' },
  B3: { value: 1_000 },
  B4: { value: 2_000 },
  B5: { value: 3_000 },
  B7: { value: '=SUM(B2:B6)' },
});

// TODO(burdon): Make it easier to create tests.
const useTestSheet = () => {
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
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
  }, []);

  return sheet;
};

// TODO(burdon): Grid.StatusBar
export const Default = () => {
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Grid.Root sheet={sheet}>
      <Grid.Main rows={50} columns={26} />
      <Grid.Debug />
    </Grid.Root>
  );
};

export const Headers = () => {
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <div className='flex overflow-hidden'>
      <Grid.Root sheet={sheet}>
        <Grid.Columns
          columns={26}
          sizes={columnSizes}
          onResize={(id, size) => setColumnSizes((sizes) => ({ ...sizes, [id]: size }))}
        />
      </Grid.Root>
    </div>
  );
};

// TODO(burdon): Virtualization.
export const Main = () => {
  const sheet = useTestSheet();
  if (!sheet) {
    return null;
  }

  return (
    <Grid.Root sheet={sheet}>
      <Grid.Content rows={50} columns={26} rowSizes={{}} columnSizes={{}} selected={{}} />
    </Grid.Root>
  );
};
