//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Space, getSpace } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';

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
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
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

  // A slide shows the sheet as a picture: the used range fitted to the slide, with no status bar.
  const slide = role === AppSurface.Slide.role;
  return (
    <SheetComponent.Root graph={graph} sheet={sheet} attendableId={attendableId!} ignoreAttention={ignoreAttention}>
      <Panel.Root
        classNames={
          role === AppSurface.Section.role ? 'aspect-square w-full max-h-full min-h-0' : slide && 'bg-transparent'
        }
      >
        {/* Editing chrome belongs to the main article; an embed or companion shows the bare grid. */}
        {role === AppSurface.Article.role && (
          <Panel.Header>
            <SheetComponent.Toolbar />
          </Panel.Header>
        )}
        <Panel.Body asChild>
          <SheetComponent.Content fit={slide} />
        </Panel.Body>
        {!slide && (
          <Panel.Footer>
            <SheetComponent.Statusbar />
          </Panel.Footer>
        )}
      </Panel.Root>
    </SheetComponent.Root>
  );
};

SheetArticle.displayName = 'SheetArticle';
