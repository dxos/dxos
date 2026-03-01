//
// Copyright 2023 DXOS.org
//

import React, { Fragment } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Container as DxContainer, Flex, type FlexProps } from '@dxos/react-ui';

import { FunctionEditor, GridSheet, SheetProvider, SheetToolbar } from '../../components';
import { ComputeGraphContextProvider, useComputeGraph } from '../../components/ComputeGraph';
import { type Sheet } from '../../types';

export type SheetContainerProps = SurfaceComponentProps<
  Sheet.Sheet,
  {
    space: Space;
    registry: ComputeGraphRegistry;
    ignoreAttention?: boolean;
  }
>;

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
    <SheetProvider sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <Root>
        <DxContainer.Main toolbar statusbar>
          <SheetToolbar id={Obj.getDXN(sheet).toString()} />
          <GridSheet />
          <FunctionEditor />
        </DxContainer.Main>
      </Root>
    </SheetProvider>
  );
};

export const SheetContainer = ({ registry, ...props }: SheetContainerProps) => (
  <ComputeGraphContextProvider registry={registry}>
    <SheetContainerInner {...props} />
  </ComputeGraphContextProvider>
);

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
