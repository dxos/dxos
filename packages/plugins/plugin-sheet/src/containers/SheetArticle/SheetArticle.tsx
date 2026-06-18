//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ComputeGraphContextProvider, Sheet, useComputeGraph } from '#components';
import { type Sheet as SheetType } from '#types';

export type SheetArticleProps = AppSurface.ObjectArticleProps<
  SheetType.Sheet,
  {
    space: Space;
    registry: ComputeGraphRegistry;
    ignoreAttention?: boolean;
  }
>;

export const SheetArticle = ({ registry, ...props }: SheetArticleProps) => (
  <ComputeGraphContextProvider registry={registry}>
    <SheetArticleInner {...props} />
  </ComputeGraphContextProvider>
);

const SheetArticleInner = ({
  role,
  subject: sheet,
  attendableId,
  space,
  ignoreAttention,
}: Omit<SheetArticleProps, 'registry'>) => {
  const graph = useComputeGraph(space);
  if (!graph) {
    return null;
  }

  return (
    <Sheet.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Panel.Root classNames={role === AppSurface.Section.role && 'aspect-aquare'}>
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
