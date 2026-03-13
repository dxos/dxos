//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ComputeGraphContextProvider, Sheet, useComputeGraph } from '../../components';
import { type Sheet as SheetType } from '../../types';

export type SheetContainerProps = SurfaceComponentProps<
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
  space,
  ignoreAttention,
}: Omit<SheetContainerProps, 'registry'>) => {
  const graph = useComputeGraph(space);
  if (!graph) {
    return null;
  }

  return (
    <Sheet.Root graph={graph} sheet={sheet} ignoreAttention={ignoreAttention}>
      <Panel.Root classNames={role === 'section' && 'aspect-aquare'}>
        <Panel.Toolbar asChild>
          <Sheet.Toolbar id={Obj.getDXN(sheet).toString()} />
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
