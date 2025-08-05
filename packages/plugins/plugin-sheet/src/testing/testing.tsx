//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useState } from 'react';

import { type ComputeGraph, type ComputeGraphOptions, ComputeGraphRegistry } from '@dxos/compute';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContextProvider } from '../components';
import { type CreateSheetOptions, createSheet } from '../types';

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

export const withComputeGraphDecorator =
  (options?: ComputeGraphOptions): Decorator =>
  (Story) => {
    const [registry] = useState(new ComputeGraphRegistry(options));
    return (
      <ComputeGraphContextProvider registry={registry}>
        <Story />
      </ComputeGraphContextProvider>
    );
  };
