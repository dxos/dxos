//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { type LayoutPart } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';
import { Toolbar } from './Toolbar';

const SheetContainer = ({
  sheet,
  space,
  role,
  layoutPart,
}: SheetRootProps & { role?: string; layoutPart?: LayoutPart }) => {
  // TODO(Zan): Sheet section toolbar should display only when the section is directly attended.
  // TODO(Zan): We have a hook useHasAttention, maybe we should have useDirectlyAttended as well?
  // Ask Will why we did it like this in MarkdownPlugin.
  // const attentionPlugin = useResolvePlugin(parseAttentionPlugin);
  // const attended = Array.from(attentionPlugin?.provides.attention?.attended ?? []);
  // const isDirectlyAttended = attended.length === 1 && attended[0] === id;

  // TODO(Zan): Centralise the toolbar action handler. Current implementation in stories.
  const handleAction = useCallback((action: any) => {
    console.log('Sheet Toolbar Action', action);
  }, []);

  return (
    <div
      role='none'
      className={mx(
        role === 'article' && 'row-span-2', // TODO(burdon): Container with toolbar.
        role === 'section' && 'aspect-square border-y border-is border-separator',
        layoutPart !== 'solo' && 'border-is border-separator',
      )}
    >
      <Sheet.Root sheet={sheet} space={space}>
        {toolbar && (
          <div role='none' className={mx('flex shrink-0 justify-center overflow-x-auto')}>
            <Toolbar.Root onAction={handleAction}>
              {/* TODO(Zan): Restore some of this functionality */}
              {/* <Toolbar.Styles /> */}
              {/* <Toolbar.Format /> */}
              {/* <Toolbar.Alignment /> */}
              <Toolbar.Separator />
              {/* TODO(Zan): Don't hard code selection. */}
              <Toolbar.Actions selection={true} />
            </Toolbar.Root>
          </div>
        )}
        <Sheet.Main />
      </Sheet.Root>
    </div>
  );
};

export default SheetContainer;
