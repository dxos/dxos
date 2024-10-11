//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';

import { type ComputeGraph } from '../../graph';
import { type SheetType } from '../../types';
import { FunctionEditor } from '../Editors/FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { SheetToolbar, type ToolbarAction } from '../Toolbar';

export const SheetContainer = ({ graph, sheet, role }: { graph: ComputeGraph; sheet: SheetType; role?: string }) => {
  const dispatch = useIntentDispatcher();

  // TODO(Zan): Centralise the toolbar action handler. Current implementation in stories.
  const handleAction = useCallback(
    (action: ToolbarAction) => {
      switch (action.type) {
        case 'comment': {
          // TODO(Zan): We shouldn't hardcode the action ID.
          void dispatch({
            action: 'dxos.org/plugin/thread/action/create',
            data: {
              cursor: action.anchor,
              name: action.cellContent,
              subject: sheet,
            },
          });
        }
      }
    },
    [sheet, dispatch],
  );

  return (
    <SheetProvider graph={graph} sheet={sheet}>
      <SheetToolbar.Root role={role} onAction={handleAction}>
        <SheetToolbar.Styles />
        <SheetToolbar.Format />
        <SheetToolbar.Alignment />
        <SheetToolbar.Separator />
        <SheetToolbar.Actions />
      </SheetToolbar.Root>
      <GridSheet />
      <FunctionEditor />
    </SheetProvider>
  );
};
