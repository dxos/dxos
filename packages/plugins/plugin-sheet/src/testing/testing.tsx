//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { useState } from 'react';

import {
  type ComputeGraph,
  type ComputeGraphOptions,
  ComputeGraphRegistry,
  rangeFromA1Notation,
} from '@dxos/compute-hyperformula';
import { createMockedComputeRuntimeProvider } from '@dxos/compute-hyperformula/testing';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContextProvider } from '#components';
import { Sheet, SheetUtil } from '#types';

export type TestSheetOptions = Sheet.SheetProps & {
  /** Formatting ranges in A1 notation. */
  ranges?: Sheet.Range[];
};

export const useTestSheet = (space?: Space, graph?: ComputeGraph, { ranges, ...options }: TestSheetOptions = {}) => {
  const [sheet] = useAsyncState(async () => {
    if (!space || !graph) {
      return;
    }

    const sheet = Sheet.make(options);
    if (ranges) {
      Obj.update(sheet, (sheet) => {
        sheet.ranges.push(
          ...ranges.map(({ range, ...rest }) => ({
            ...rest,
            range: SheetUtil.rangeToIndex(sheet, rangeFromA1Notation(range)),
          })),
        );
      });
    }

    space.db.add(sheet);
    return sheet;
  }, [space, graph]);
  return sheet;
};

/**
 * Provides the compute-graph context. Pass `registry` when the story also contributes it as the
 * `ComputeGraphRegistry` capability, so the context and the capability share one instance.
 */
export const withComputeGraphDecorator =
  (options?: Partial<ComputeGraphOptions> & { registry?: ComputeGraphRegistry }): Decorator =>
  (Story) => {
    const [registry] = useState(
      () =>
        options?.registry ??
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
