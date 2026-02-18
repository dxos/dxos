//
// Copyright 2023 DXOS.org
//

import React, { Fragment } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Flex, type FlexProps, Layout } from '@dxos/react-ui';

import { type Sheet } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { SheetToolbar } from '../SheetToolbar';

export type SheetContainerProps = SurfaceComponentProps<
  Sheet.Sheet,
  {
    space: Space;
    ignoreAttention?: boolean;
  }
>;

export const SheetContainer = ({ role, subject: sheet, space, ignoreAttention }: SheetContainerProps) => {
  const graph = useComputeGraph(space);
  if (!graph) {
    return null;
  }

  const Root = role === 'section' ? Container : Fragment;

  return (
    <SheetProvider sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <Root>
        <Layout.Main toolbar statusbar>
          <SheetToolbar id={Obj.getDXN(sheet).toString()} />
          <GridSheet />
          <FunctionEditor />
        </Layout.Main>
      </Root>
    </SheetProvider>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
