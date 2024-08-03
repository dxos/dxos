//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { create, type EchoReactiveObject } from '@dxos/echo-schema';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { SheetComponent, type MatrixProps } from './Sheet';
import { type CellSchema, SheetType } from '../../types';

export default {
  title: 'plugin-sheet/Matrix',
  component: SheetComponent,
  render: (args: MatrixProps) => <Story {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const createCells = (): Record<string, CellSchema> => ({
  A1: { value: '1000' },
  A2: { value: '2000' },
  A3: { value: '3000' },
  A5: { value: '=SUM(A1:A3)' },
});

const Story = ({ cells, ...props }: MatrixProps & { cells?: Record<string, CellSchema> }) => {
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Make it easier to create tests.
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);
      const sheet = create(SheetType, {
        title: 'Test',
        cells: cells ?? {},
      });
      space.db.add(sheet);

      setSheet(sheet);
    });
  }, []);

  if (!sheet) {
    return null;
  }

  return <SheetComponent {...props} sheet={sheet} />;
};

export const Default = {
  args: {
    cells: createCells(),
  },
};

export const Data = {
  args: {
    cells: createCells(),
  },
};

export const Readonly = {
  args: {
    readonly: true,
    cells: createCells(),
  },
};
