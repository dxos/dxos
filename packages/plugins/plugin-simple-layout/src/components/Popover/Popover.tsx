//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Popover, type PopoverContentInteractOutsideEvent, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';

const DEBOUNCE_DELAY = 40;

type LayoutPopoverContextValue = {
  setOpen: (open: boolean) => void;
};

const [LayoutPopoverProvider, useLayoutPopoverContext] = createContext<LayoutPopoverContextValue>('LayoutPopover');

export const PopoverRoot = ({ children }: PropsWithChildren) => {
  const { state } = useSimpleLayoutState();
  const [open, setOpen] = useState(false);
  const virtualRef = useRef<HTMLButtonElement | null>(null);
  const [virtualIter, setVirtualIter] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // TODO(thure): This is a workaround for the race condition between displaying a Popover and either rendering
  //  the anchor further down the tree or measuring the virtual trigger's client rect.
  useEffect(() => {
    setOpen(false);
    if (state.popoverOpen) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (state.popoverAnchor && virtualRef.current !== state.popoverAnchor) {
        virtualRef.current = state.popoverAnchor ?? null;
        setVirtualIter((iter) => iter + 1);
      }
      debounceRef.current = setTimeout(() => setOpen(true), DEBOUNCE_DELAY);
    }
  }, [state.popoverOpen, state.popoverAnchorId, state.popoverAnchor, state.popoverContent]);

  return (
    <LayoutPopoverProvider setOpen={setOpen}>
      <Popover.Root modal={false} open={open}>
        {state.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
        {children}
      </Popover.Root>
    </LayoutPopoverProvider>
  );
};

export const PopoverContent = () => {
  const { t } = useTranslation(meta.id);
  const { state, updateState } = useSimpleLayoutState();
  const { setOpen } = useLayoutPopoverContext('PopoverContent');

  const handleClose = useCallback(() => {
    setOpen(false);
    updateState((s) => ({
      ...s,
      popoverOpen: false,
      popoverAnchor: undefined,
      popoverAnchorId: undefined,
      popoverSide: undefined,
    }));
  }, [setOpen, updateState]);

  const handleInteractOutside = useCallback(
    (event: KeyboardEvent | PopoverContentInteractOutsideEvent) => {
      if (
        // TODO(thure): CodeMirror should not focus itself when it updates.
        event.type === 'dismissableLayer.focusOutside' &&
        (event.currentTarget as HTMLElement | undefined)?.classList.contains('cm-content')
      ) {
        event.preventDefault();
      } else {
        handleClose();
      }
    },
    [handleClose],
  );

  const collisionBoundaries: HTMLElement[] = useMemo(() => {
    const closest = state.popoverAnchor?.closest('[data-popover-collision-boundary]') as HTMLElement | null | undefined;
    return closest ? [closest] : [];
  }, [state.popoverAnchor]);

  return (
    <Popover.Portal>
      <Popover.Content
        side={state.popoverSide}
        sticky='always'
        hideWhenDetached
        collisionBoundary={collisionBoundaries}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <Popover.Viewport>
          {state.popoverKind === 'base' && <Surface role='popover' data={state.popoverContent} limit={1} />}
          {state.popoverKind === 'card' && (
            <Card.Root border={false} classNames='popover-card-max-width'>
              <Card.Toolbar>
                {/* TODO(wittjosiah): Cleaner way to handle no drag handle in toolbar? */}
                <span />
                {state.popoverTitle ? <Card.Title>{toLocalizedString(state.popoverTitle, t)}</Card.Title> : <span />}
                <Card.Close onClick={handleClose} />
              </Card.Toolbar>
              <Surface role='card--content' data={state.popoverContent} limit={1} />
            </Card.Root>
          )}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
