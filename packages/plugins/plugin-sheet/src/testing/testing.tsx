//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type ComputeGraph, type ComputeGraphOptions, ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { createMockedComputeRuntimeProvider } from '@dxos/compute-hyperformula/testing';
import { addressFromA1Notation } from '@dxos/compute-hyperformula/types';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContextProvider } from '#components';
import { Sheet } from '#types';

export type TestSheetProps = Sheet.SheetProps & {
  /** Column widths in px by column letter (e.g., `{ D: 384 }`). */
  columnSizes?: Record<string, number>;
};

export const useTestSheet = (space?: Space, graph?: ComputeGraph, options?: TestSheetProps) => {
  const [sheet] = useAsyncState(async () => {
    if (!space || !graph) {
      return;
    }

    const { columnSizes, ...props } = options ?? {};
    const sheet = Sheet.make(props);
    if (columnSizes) {
      Obj.update(sheet, (sheet) => {
        Object.entries(columnSizes).forEach(([column, size]) => {
          const columnId = sheet.columns[addressFromA1Notation(`${column}1`).col];
          sheet.columnMeta[columnId] = { ...sheet.columnMeta[columnId], size };
        });
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
