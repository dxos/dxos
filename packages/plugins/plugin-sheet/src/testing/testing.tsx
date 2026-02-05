//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useState } from 'react';

import { type ComputeGraph, type ComputeGraphOptions, ComputeGraphRegistry } from '@dxos/compute';
import { createMockedComputeRuntimeProvider } from '@dxos/compute/testing';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContextProvider } from '../components';
import { Sheet } from '../types';

export const useTestSheet = (space?: Space, graph?: ComputeGraph, options?: Sheet.SheetProps) => {
  const [sheet] = useAsyncState(async () => {
    if (!space || !graph) {
      return;
    }

    const sheet = Sheet.make(options);
    space.db.add(sheet);
    return sheet;
  }, [space, graph]);
  return sheet;
};

export const withComputeGraphDecorator =
  (options?: Partial<ComputeGraphOptions>): Decorator =>
  (Story) => {
    const [registry] = useState(
      new ComputeGraphRegistry({
        ...options,
        computeRuntime: options?.computeRuntime ?? createMockedComputeRuntimeProvider(),
      }),
    );
    return (
      <ComputeGraphContextProvider registry={registry}>
        <Story />
      </ComputeGraphContextProvider>
    );
  };
