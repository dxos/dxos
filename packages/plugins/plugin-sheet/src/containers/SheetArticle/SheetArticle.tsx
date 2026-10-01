//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';

import { ComputeGraphContextProvider, Sheet as SheetComponent, useComputeGraph } from '#components';
import { Sheet, SheetCapabilities } from '#types';

export type SheetArticleProps = AppSurface.ObjectArticleProps<
  Sheet.Sheet,
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
    <SheetComponent.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Next.Panel.Root classNames={role === AppSurface.Section.role && 'aspect-square w-full max-h-full min-h-0'}>
        <Next.Panel.Header>
          <SheetComponent.Toolbar />
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <SheetComponent.Content />
        </Next.Panel.Body>
        <Next.Panel.Footer>
          <SheetComponent.Statusbar />
        </Next.Panel.Footer>
      </Next.Panel.Root>
    </SheetComponent.Root>
  );
};

SheetArticle.displayName = 'SheetArticle';
