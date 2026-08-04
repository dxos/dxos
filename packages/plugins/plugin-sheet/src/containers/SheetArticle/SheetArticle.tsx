//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ComputeGraphContextProvider, Sheet, useComputeGraph } from '#components';
import { SheetCapabilities, type Sheet as SheetType } from '#types';

export type SheetArticleProps = AppSurface.ObjectArticleProps<
  SheetType.Sheet,
  {
    ignoreAttention?: boolean;
  }
>;

/**
 * Resolves the compute-graph registry capability and the sheet's space, then scopes the article to
 * that registry. A sheet outside a space has no graph to evaluate against.
 */
export const SheetArticle = ({ subject, ...props }: SheetArticleProps) => {
  const registry = useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <SheetArticleInner {...props} subject={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

const SheetArticleInner = ({
  role,
  subject: sheet,
  attendableId,
  space,
  ignoreAttention,
}: SheetArticleProps & { space: Space }) => {
  const graph = useComputeGraph(space);
  if (!graph) {
    return null;
  }

  return (
    <Sheet.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Panel.Root classNames={role === AppSurface.Section.role && 'aspect-square'}>
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

SheetArticle.displayName = 'SheetArticle';
