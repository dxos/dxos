//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { create, type EchoReactiveObject } from '@dxos/echo-schema';
import { Tooltip } from '@dxos/react-ui';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Sheet, type SheetRootProps } from './Sheet';
import { useSheetContext } from './context';
import { type CellValue, SheetType } from '../../types';
import { Toolbar, type ToolbarProps } from '../Toolbar';

export default {
  title: 'plugin-sheet/Sheet',
  component: Sheet,
  render: (args: SheetRootProps) => <Story {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const createCells = (): Record<string, CellValue> => ({
  A1: { value: '1000' },
  A2: { value: '2000' },
  A3: { value: '3000' },
  A5: { value: '=SUM(A1:A3)' },
});

const Story = ({ cells, ...props }: SheetRootProps & { cells?: Record<string, CellValue> }) => {
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
        formatting: {},
      });
      space.db.add(sheet);
      setSheet(sheet);
    });
  }, []);

  if (!sheet) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Sheet.Root {...props} sheet={sheet}>
        <SheetToolbar />
        <Sheet.Grid />
        <Sheet.StatusBar />
        <Sheet.Debug />
      </Sheet.Root>
    </Tooltip.Provider>
  );
};

const SheetToolbar = () => {
  const { selected, setFormat } = useSheetContext();
  const handleAction: ToolbarProps['onAction'] = ({ type }) => {
    if (selected) {
      setFormat(selected, { styles: ['bg-yellow-500'] });
    }
  };

  return (
    <Toolbar.Root onAction={handleAction}>
      <Toolbar.Alignment />
      <Toolbar.Separator />
      <Toolbar.Actions />
    </Toolbar.Root>
  );
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
