//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { branchStateAtom } from '@dxos/echo-client';
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
  mode,
  compareBranch,
  space,
  ignoreAttention,
}: Omit<SheetArticleProps, 'registry'>) => {
  const graph = useComputeGraph(space);
  // The viewed branch: switching it rebinds the sheet to another document, so the model must be
  // recreated to read the new branch's cells (see SheetRoot/useSheetModel).
  const { current: currentBranch } = useAtomValue(branchStateAtom(sheet));
  if (!graph) {
    return null;
  }

  return (
    <Sheet.Root
      graph={graph}
      sheet={sheet}
      attendableId={attendableId!}
      // Compare against another branch only in the distinct `'diff'` mode (a cell-level diff overlay).
      compareBranch={mode === 'diff' ? compareBranch : undefined}
      branch={currentBranch}
      // Lock editing while time-traveling (the `'readonly'` mode), like the markdown article.
      readonly={mode === 'readonly'}
      ignoreAttention={ignoreAttention}
    >
      <Panel.Root classNames={role === 'section' && 'aspect-aquare'}>
        <Panel.Toolbar asChild>
          <Sheet.Toolbar disabled={mode === 'readonly'} />
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
