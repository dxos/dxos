//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';

import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider, type SheetProviderProps } from '../SheetContext';
import { Toolbar, type ToolbarAction } from '../Toolbar';

export const SheetContainer = ({ graph, sheet, role }: SheetProviderProps & { role?: string }) => {
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
    <SheetProvider sheet={sheet} graph={graph}>
      <Toolbar.Root onAction={handleAction} role={role}>
        <Toolbar.Styles />
        <Toolbar.Format />
        <Toolbar.Alignment />
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <div role='none' className='border-bs border-separator grid cols-1 rows-[1fr_min-content] min-bs-0'>
        <GridSheet />
        <FunctionEditor />
      </div>
    </SheetProvider>
  );
};
