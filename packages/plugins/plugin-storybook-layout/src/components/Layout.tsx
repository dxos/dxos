//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { LayoutState } from '../capabilities';

// TODO(wittjosiah): Support dialogs, tooltips, maybe toast.
//   Provide root container along the lines with `withLayout` decorator.
export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const layout = useCapability(LayoutState);
  const [iter, setIter] = useState(0);

  useEffect(() => {
    trigger.current = layout.popoverAnchor ?? null;
    setIter((iter) => iter + 1);
  }, [layout.popoverAnchor, layout.popoverContent]);

  const handlePopoverOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        layout.popoverOpen = true;
      } else {
        layout.popoverOpen = false;
        layout.popoverAnchor = undefined;
        layout.popoverAnchorId = undefined;
        layout.popoverSide = undefined;
      }
    },
    [layout],
  );

  const handlePopoverClose = useCallback(() => handlePopoverOpenChange(false), [handlePopoverOpenChange]);

  return (
    <Popover.Root open={layout.popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <Popover.VirtualTrigger key={iter} virtualRef={trigger} />
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
