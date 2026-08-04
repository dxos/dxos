//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ComputeGraphContextProvider, Sheet as SheetComponent, useComputeGraph } from '#components';

import type * as Sheet from '../../types/Sheet';

export type SheetArticleProps = AppSurface.ObjectArticleProps<
  Sheet.Sheet,
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
    <SheetComponent.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Panel.Root classNames={role === AppSurface.Section.role && 'aspect-square'}>
        <Panel.Toolbar asChild>
          <SheetComponent.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SheetComponent.Content />
        </Panel.Content>
        <Panel.Statusbar asChild>
          <SheetComponent.Statusbar />
        </Panel.Statusbar>
      </Panel.Root>
    </SheetComponent.Root>
  );
};

SheetArticle.displayName = 'SheetArticle';
