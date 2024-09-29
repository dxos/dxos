//
// Copyright 2024 DXOS.org
//

import type { Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { type Space } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider } from '../components';
import { createSheet } from '../defs';
import { type ComputeGraph, ComputeGraphRegistry } from '../graph';
import { type CellValue, type SheetType } from '../types';

export const testSheetName = 'test';

// TODO(thure): Remove this from the `/testing` entrypoint.
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

export const useTestSheet = (space?: Space, graph?: ComputeGraph) => {
  const [sheet, setSheet] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    if (!space || !graph) {
      return;
    }

    const t = setTimeout(async () => {
      const sheet = createSheet();
      space.db.add(sheet);
      setSheet(sheet);
    });

    return () => clearTimeout(t);
  }, [space]);

  return sheet;
};

export const withGraphDecorator: Decorator = (Story) => {
  const [registry] = useState(new ComputeGraphRegistry());
  return (
    <ComputeGraphContextProvider registry={registry}>
      <Story />
    </ComputeGraphContextProvider>
  );
};
