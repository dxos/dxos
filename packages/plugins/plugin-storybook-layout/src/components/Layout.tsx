//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { LayoutState } from '../capabilities';

const debounce_delay = 100;

// TODO(wittjosiah): Support dialogs, tooltips, maybe toast.
//   Provide root container along the lines with `withLayout` decorator.
export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const layout = useCapability(LayoutState);
  const [iter, setIter] = useState(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setOpen(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    trigger.current = layout.popoverAnchor ?? null;
    setIter((iter) => iter + 1);
    if (layout.popoverOpen) {
      debounceRef.current = setTimeout(() => setOpen(true), debounce_delay);
    }
  }, [layout.popoverAnchor, layout.popoverContent, layout.popoverOpen]);

  const handleInteractOutside = useCallback(() => {
    setOpen(false);
    layout.popoverOpen = false;
    layout.popoverAnchor = undefined;
    layout.popoverAnchorId = undefined;
    layout.popoverSide = undefined;
  }, []);

  return (
    <Popover.Root open={open}>
      <Popover.VirtualTrigger key={iter} virtualRef={trigger} />
      <Popover.Portal>
        <Popover.Content
          side={layout.popoverSide}
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleInteractOutside}
        >
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
