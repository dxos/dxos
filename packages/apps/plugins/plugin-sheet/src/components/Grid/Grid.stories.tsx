//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import type { EchoReactiveObject } from '@dxos/echo-schema';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Grid, type GridRootProps } from './Grid';
import { SheetModel } from '../../model';
import { type CellValue, createSheet, SheetType } from '../../types';

export default {
  title: 'plugin-sheet/Grid',
  component: Grid,
  render: (args: GridRootProps) => <Story {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const createCells = (): Record<string, CellValue> => ({
  A1: { value: 1_000 },
  A2: { value: 2_000 },
  A3: { value: 3_000 },
  A5: { value: '=SUM(A1:A3)' },
});

const Story = (props: GridRootProps) => {
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Make it easier to create tests.
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

  if (!sheet) {
    return null;
  }

  return <Grid.Root sheet={sheet} {...props} />;
};

export const Default = {
  args: {
    rows: 50,
    columns: 20,
  },
};
