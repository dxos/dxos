//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ComputeGraphContextProvider, Sheet, useComputeGraph } from '#components';
import { type Sheet as SheetType } from '#types';

export type SheetContainerProps = AppSurface.ObjectArticleProps<
  SheetType.Sheet,
  {
    space: Space;
    registry: ComputeGraphRegistry;
    ignoreAttention?: boolean;
  }
>;

export const SheetContainer = ({ registry, ...props }: SheetContainerProps) => (
  <ComputeGraphContextProvider registry={registry}>
    <SheetContainerInner {...props} />
  </ComputeGraphContextProvider>
);

const SheetContainerInner = ({
  role,
  subject: sheet,
  attendableId,
  space,
  ignoreAttention,
}: Omit<SheetContainerProps, 'registry'>) => {
  const graph = useComputeGraph(space);
  if (!graph) {
    return null;
  }

  return (
    <Sheet.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Panel.Root classNames={role === 'section' && 'aspect-aquare'}>
        <Panel.Toolbar asChild>
          <Sheet.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Sheet.Content />
        </Panel.Content>
        <Panel.Statusbar asChild>
          <Sheet.Statusbar />
        </Panel.Statusbar>
      </Panel.Root>
    </Sheet.Root>
  );
};
