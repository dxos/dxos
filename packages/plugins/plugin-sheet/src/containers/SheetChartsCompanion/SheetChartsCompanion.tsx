//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space, getSpace } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider, SheetCharts, useComputeGraph } from '#components';
import { type Sheet, SheetCapabilities } from '#types';

import { useSheetModel } from '../../model/index.ts';

export type SheetChartsCompanionProps = {
  role?: string;
  subject: Sheet.Sheet;
};

/** Charts of the sheet's ranges, kept on the sheet; shares the sheet's selection through the `Selection` view state. */
export const SheetChartsCompanion = ({ subject }: SheetChartsCompanionProps) => {
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <SheetChartsCompanionInner sheet={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

SheetChartsCompanion.displayName = 'SheetChartsCompanion';

const SheetChartsCompanionInner = ({ sheet, space }: { sheet: Sheet.Sheet; space: Space }) => {
  const graph = useComputeGraph(space);
  const model = useSheetModel(graph, sheet);
  return model ? <SheetCharts sheet={sheet} model={model} /> : null;
};
