//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { create, type EchoReactiveObject } from '@dxos/echo-schema';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Matrix, type MatrixProps } from './Matrix';
import { type CellSchema, SheetType } from './types';

// TODO(burdon): Experiments.
// "grid": "^4.10.8",
// "gridstack": "^10.2.0",

export default {
  title: 'plugin-grid/Matrix',
  component: Matrix,
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
  const [object, setObject] = useState<EchoReactiveObject<SheetType>>();
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

      setObject(sheet);
    });
  }, []);

  if (!object) {
    return null;
  }

  return <Matrix {...props} object={object} />;
};

export const Default = {
  args: {
    editable: true,
    cells: createCells(),
  },
};

export const Data = {
  args: {
    editable: true,
    cells: createCells(),
  },
};

export const Readonly = {
  args: {
    editable: false,
    cells: createCells(),
  },
};
