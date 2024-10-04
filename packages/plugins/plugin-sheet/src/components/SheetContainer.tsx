//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useIsDirectlyAttended } from '@dxos/react-ui-attention';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';
import { Toolbar, type ToolbarAction } from './Toolbar';

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
const attentionFragment = mx(
  'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface',
  'group-focus-within/editor:border-separator',
);

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout =
  'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 __-block-start-px transition-opacity';

const SheetContainer = ({ graph, sheet, role }: SheetRootProps & { role?: string }) => {
  const dispatch = useIntentDispatcher();

  const id = fullyQualifiedId(sheet);
  const isDirectlyAttended = useIsDirectlyAttended(id);

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
    <div role='none' className={role === 'article' ? 'row-span-2 grid grid-rows-subgrid' : undefined}>
      <Sheet.Root graph={graph} sheet={sheet}>
        <div role='none' className={mx('flex flex-0 justify-center overflow-x-auto')}>
          <Toolbar.Root
            onAction={handleAction}
            classNames={mx(
              role === 'section'
                ? ['z-[2] group-focus-within/section:visible', !isDirectlyAttended && 'invisible', sectionToolbarLayout]
                : 'group-focus-within/editor:border-separator group-[[aria-current]]/editor:border-separator',
            )}
          >
            {/* TODO(Zan): Restore some of this functionality */}
            {/* <Toolbar.Styles /> */}
            {/* <Toolbar.Format /> */}
            {/* <Toolbar.Alignment /> */}
            <Toolbar.Separator />
            <Toolbar.Actions />
          </Toolbar.Root>
        </div>
        <div
          role='none'
          className={mx(
            role === 'section' && 'aspect-square border-is border-bs border-be border-separator',
            role === 'article' &&
              'flex is-full overflow-hidden focus-visible:ring-inset row-span-1 data-[toolbar=disabled]:pbs-2 data-[toolbar=disabled]:row-span-2 border-bs border-separator',
            focusRing,
            attentionFragment,
          )}
        >
          <Sheet.Main />
        </div>
      </Sheet.Root>
    </div>
  );
};

export default SheetContainer;
