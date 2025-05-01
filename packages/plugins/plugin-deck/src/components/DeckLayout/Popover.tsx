//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { DeckCapabilities } from '../../capabilities';

export type DeckPopoverRootProps = PropsWithChildren<{}>;

export const PopoverRoot = ({ children }: DeckPopoverRootProps) => {
  const context = useCapability(DeckCapabilities.MutableDeckState);

  // TODO(thure): This is a workaround for the difference in `React`ion time between displaying a Popover and rendering
  //  the anchor further down the tree. Refactor to use VirtualTrigger or some other approach which does not cause a lag.
  const [delayedPopoverVisibility, setDelayedPopoverVisibility] = useState(false);
  useEffect(() => {
    context.popoverOpen ? setTimeout(() => setDelayedPopoverVisibility(true), 40) : setDelayedPopoverVisibility(false);
  }, [context.popoverOpen]);

  const handlePopoverOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && context.popoverAnchorId) {
        context.popoverOpen = true;
      } else {
        context.popoverOpen = false;
        context.popoverAnchorId = undefined;
        context.popoverSide = undefined;
      }
    },
    [context],
  );

  return (
    <Popover.Root
      modal
      open={!!(context.popoverAnchorId && delayedPopoverVisibility)}
      onOpenChange={handlePopoverOpenChange}
    >
      {children}
    </Popover.Root>
  );
};

export const PopoverContent = () => {
  const context = useCapability(DeckCapabilities.MutableDeckState);
  const handlePopoverClose = useCallback(() => {
    context.popoverOpen = false;
    context.popoverAnchorId = undefined;
    context.popoverSide = undefined;
  }, [context]);

  return (
    <Popover.Portal>
      <Popover.Content side={context.popoverSide} onEscapeKeyDown={handlePopoverClose}>
        <Popover.Viewport>
          <Surface role='popover' data={context.popoverContent} limit={1} />
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
