//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Space, getSpace } from '@dxos/react-client/echo';
import * as Card from '@dxos/react-ui/Card';

import { ComputeGraphContextProvider, SheetPreview, useComputeGraph } from '#components';
import { type Sheet, SheetCapabilities } from '#types';

export type SheetCardProps = AppSurface.ObjectCardProps<Sheet.Sheet>;

export const SheetCard = ({ subject }: SheetCardProps) => {
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <SheetCardInner sheet={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

SheetCard.displayName = 'SheetCard';

const SheetCardInner = ({ sheet, space }: { sheet: Sheet.Sheet; space: Space }) => {
  const graph = useComputeGraph(space);
  const chartTypes = Hooks.useCapabilities(SheetCapabilities.ChartType);
  if (!graph) {
    return null;
  }

  return (
    <Card.Poster position='end'>
      <SheetPreview sheet={sheet} graph={graph} chartTypes={chartTypes} />
    </Card.Poster>
  );
};
