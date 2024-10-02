//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useState } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContextProvider } from '../components';
import { createSheet } from '../defs';
import { type ComputeGraph, ComputeGraphRegistry } from '../graph';
import { type CellValue, type CreateSheetOptions } from '../types';

const testSheetName = 'test';

export const createTestCells = (): Record<string, CellValue> => ({
  B1: { value: 'Qty2' },
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

export const useTestSheet = (space?: Space, graph?: ComputeGraph, options?: CreateSheetOptions) => {
  const [sheet] = useAsyncState(async () => {
    if (!space || !graph) {
      return;
    }

    const sheet = createSheet(options);
    space.db.add(sheet);
    return sheet;
  }, [space, graph]);
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
