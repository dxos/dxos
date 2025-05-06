//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { DeckCapabilities } from '../../capabilities';

export type DeckPopoverRootProps = PropsWithChildren<{}>;

const DEBOUNCE_DELAY = 40;

export const PopoverRoot = ({ children }: DeckPopoverRootProps) => {
  const layout = useCapability(DeckCapabilities.MutableDeckState);
  const virtualRef = useRef<HTMLButtonElement | null>(null);
  const [virtualIter, setVirtualIter] = useState(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // TODO(thure): This is a workaround for the race condition between displaying a Popover and either rendering
  //  the anchor further down the tree or measuring the virtual trigger’s client rect.
  useEffect(() => {
    setOpen(false);
    if (layout.popoverOpen) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (layout.popoverAnchor && virtualRef.current !== layout.popoverAnchor) {
        virtualRef.current = layout.popoverAnchor ?? null;
        setVirtualIter((iter) => iter + 1);
      }
      debounceRef.current = setTimeout(() => setOpen(true), DEBOUNCE_DELAY);
    }
  }, [layout.popoverOpen, layout.popoverAnchorId, layout.popoverAnchor, layout.popoverContent]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setOpen(false);
        layout.popoverOpen = false;
        layout.popoverAnchor = undefined;
        layout.popoverAnchorId = undefined;
        layout.popoverSide = undefined;
      }
    },
    [layout],
  );

  return (
    <Popover.Root modal open={open} onOpenChange={handleOpenChange}>
      {layout.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
      {children}
    </Popover.Root>
  );
};

export const PopoverContent = () => {
  const layout = useCapability(DeckCapabilities.MutableDeckState);

  return (
    <Popover.Portal>
      <Popover.Content side={layout.popoverSide}>
        <Popover.Viewport>
          <Surface role='popover' data={layout.popoverContent} limit={1} />
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
