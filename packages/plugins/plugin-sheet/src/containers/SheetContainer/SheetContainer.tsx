//
// Copyright 2023 DXOS.org
//

import React, { Fragment } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Flex, type FlexProps, Panel } from '@dxos/react-ui';

import { Sheet } from '../../components';
import { ComputeGraphContextProvider, useComputeGraph } from '../../components/ComputeGraph';
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

  const Root = role === 'section' ? Container : Fragment;

  return (
    <Sheet.Root sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <Root>
        <Panel.Root>
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
      </Root>
    </Sheet.Root>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
