//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Popover, type PopoverContentInteractOutsideEvent, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';

import { useDeckState } from '../../hooks';
import { meta } from '../../meta';

export type DeckPopoverRootProps = PropsWithChildren<{}>;

const DEBOUNCE_DELAY = 40;

type DeckPopoverContextValue = {
  setOpen: (open: boolean) => void;
};

const [DeckPopoverProvider, useDeckPopoverContext] = createContext<DeckPopoverContextValue>('DeckPopover');

export const PopoverRoot = ({ children }: DeckPopoverRootProps) => {
  const { state } = useDeckState();
  const virtualRef = useRef<HTMLButtonElement | null>(null);
  const [virtualIter, setVirtualIter] = useState(0);
  const [open, setOpen] = useState(false);
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
    <DeckPopoverProvider setOpen={setOpen}>
      <Popover.Root modal={false} open={open}>
        {state.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
        {children}
      </Popover.Root>
    </DeckPopoverProvider>
  );
};

export const PopoverContent = () => {
  const { t } = useTranslation(meta.id);
  const { state, updateEphemeral } = useDeckState();
  const { setOpen } = useDeckPopoverContext('PopoverContent');

  const handleClose = useCallback(() => {
    setOpen(false);
    updateEphemeral((s) => ({
      ...s,
      popoverOpen: false,
      popoverAnchor: undefined,
      popoverAnchorId: undefined,
      popoverSide: undefined,
    }));
  }, [updateEphemeral]);

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

  return (
    <Popover.Portal>
      <Popover.Content
        side={state.popoverSide}
        sticky='always'
        hideWhenDetached
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <Popover.Viewport>
          {state.popoverKind === 'card' && (
            <Card.Root>
              <Card.Toolbar>
                {/* TODO(wittjosiah): Cleaner way to handle no drag handle in toolbar? */}
                <span />
                {state.popoverTitle && <Card.Title>{toLocalizedString(state.popoverTitle, t)}</Card.Title>}
                <Card.Close onClose={handleClose} />
              </Card.Toolbar>
              <Surface role='card--content' data={state.popoverContent} limit={1} />
            </Card.Root>
          )}
          {state.popoverKind === 'base' && <Surface role='popover' data={state.popoverContent} limit={1} />}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
