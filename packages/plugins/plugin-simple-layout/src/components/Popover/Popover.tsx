//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework/react';
import { Popover, type PopoverContentInteractOutsideEvent } from '@dxos/react-ui';

import { SimpleLayoutState } from '../../types';

const DEBOUNCE_DELAY = 40;

type LayoutPopoverContextValue = {
  setOpen: (open: boolean) => void;
};

const [LayoutPopoverProvider, useLayoutPopoverContext] = createContext<LayoutPopoverContextValue>('LayoutPopover');

export const PopoverRoot = ({ children }: PropsWithChildren) => {
  const layout = useCapability(SimpleLayoutState);
  const [open, setOpen] = useState(false);
  const virtualRef = useRef<HTMLButtonElement | null>(null);
  const [virtualIter, setVirtualIter] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // TODO(thure): This is a workaround for the race condition between displaying a Popover and either rendering
  //  the anchor further down the tree or measuring the virtual trigger's client rect.
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

  return (
    <LayoutPopoverProvider setOpen={setOpen}>
      <Popover.Root modal={false} open={open}>
        {layout.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
        {children}
      </Popover.Root>
    </LayoutPopoverProvider>
  );
};

export const PopoverContent = () => {
  const layout = useCapability(SimpleLayoutState);
  const { setOpen } = useLayoutPopoverContext('PopoverContent');

  const handleClose = useCallback(
    (event: KeyboardEvent | PopoverContentInteractOutsideEvent) => {
      if (
        // TODO(thure): CodeMirror should not focus itself when it updates.
        event.type === 'dismissableLayer.focusOutside' &&
        (event.currentTarget as HTMLElement | undefined)?.classList.contains('cm-content')
      ) {
        event.preventDefault();
      } else {
        setOpen(false);
        layout.popoverOpen = false;
        layout.popoverAnchor = undefined;
        layout.popoverAnchorId = undefined;
        layout.popoverSide = undefined;
      }
    },
    [setOpen],
  );

  const collisionBoundaries: HTMLElement[] = useMemo(() => {
    const closest = layout.popoverAnchor?.closest('[data-popover-collision-boundary]') as
      | HTMLElement
      | null
      | undefined;
    return closest ? [closest] : [];
  }, [layout.popoverAnchor]);

  return (
    <Popover.Portal>
      <Popover.Content
        side={layout.popoverSide}
        onInteractOutside={handleClose}
        onEscapeKeyDown={handleClose}
        collisionBoundary={collisionBoundaries}
        sticky='always'
        hideWhenDetached
      >
        <Popover.Viewport>
          <Surface role='card--popover' data={layout.popoverContent} limit={1} />
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
