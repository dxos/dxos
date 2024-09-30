//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher, type LayoutContainerProps } from '@dxos/app-framework';
import { useIsDirectlyAttended } from '@dxos/react-ui-attention';
import { Table } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';
import { Toolbar, type ToolbarAction } from '../components/Toolbar';

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 transition-opacity';

const TableContainer = ({ role, table }: LayoutContainerProps<Omit<ObjectTableProps, 'role' | 'getScrollElement'>>) => {
  const isDirectlyAttended = useIsDirectlyAttended();
  const dispatch = useIntentDispatcher();

  const onThreadCreate = useCallback(() => {
    void dispatch({
      // TODO(Zan): We shouldn't hardcode the action ID.
      action: 'dxos.org/plugin/thread/action/create',
      data: {
        subject: table,
        cursor: Date.now().toString(), // TODO(Zan): Consider a more appropriate anchor format.
      },
    });
  }, [dispatch, table]);

  const handleAction = (action: ToolbarAction) => {
    switch (action.type) {
      case 'comment': {
        onThreadCreate();
        break;
      }
    }
  };

  return (
    <div role='none' className={role === 'article' ? 'row-span-2 grid grid-rows-subgrid' : undefined}>
      <div role='none' className={mx('flex flex-0 justify-center overflow-x-auto')}>
        <Toolbar.Root
          onAction={handleAction}
          classNames={mx(
            role === 'section'
              ? ['z-[2] group-focus-within/section:visible', !isDirectlyAttended && 'invisible', sectionToolbarLayout]
              : 'group-focus-within/editor:border-separator group-[[aria-current]]/editor:border-separator',
          )}
        >
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
      </div>
      <Table.Root>
        <Table.Viewport
          classNames={mx(
            role === 'article' && 'block-start-[--topbar-size] max-bs-full row-span-2 is-full sticky-top-0 -mbs-px',
            role === 'section' && 'max-bs-96 is-full sticky-top-0 !bg-[--surface-bg] -mis-px -mbs-px',
            role === 'slide' && 'bs-full overflow-auto grid place-items-center',
          )}
        >
          <ObjectTable
            key={table.id} // New component instance per table.
            table={table}
            role='grid'
            stickyHeader
          />
        </Table.Viewport>
      </Table.Root>
    </div>
  );
};

export default TableContainer;
