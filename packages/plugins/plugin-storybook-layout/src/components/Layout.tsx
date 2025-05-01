//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { LayoutState } from '../capabilities';

// TODO(wittjosiah): Support dialogs, tooltips, maybe toast.
//   Provide root container along the lines with `withLayout` decorator.
export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const layout = useCapability(LayoutState);

  useEffect(() => {
    trigger.current = layout.popoverAnchor ?? null;
  }, [layout.popoverAnchor]);

  const handlePopoverOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && layout.popoverAnchorId) {
        layout.popoverOpen = true;
      } else {
        layout.popoverOpen = false;
        layout.popoverAnchorId = undefined;
        layout.popoverSide = undefined;
      }
    },
    [layout],
  );
  const handlePopoverClose = useCallback(() => handlePopoverOpenChange(false), [handlePopoverOpenChange]);

  return (
    <Popover.Root open={layout.popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <Popover.VirtualTrigger virtualRef={trigger} />
      <Popover.Portal>
        <Popover.Content side={layout.popoverSide} onEscapeKeyDown={handlePopoverClose}>
          <Popover.Viewport>
            <Surface role='popover' data={layout.popoverContent} limit={1} />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
      {children}
    </Popover.Root>
  );
};
