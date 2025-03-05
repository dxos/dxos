//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, forwardRef, useImperativeHandle, useState, useEffect, Children } from 'react';

import { invariant } from '@dxos/invariant';
import { ScrollArea, AnchoredOverflow, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export interface ScrollController {
  scrollToBottom: () => void;
}

export type ScrollContainerProps = ThemedClassName<
  PropsWithChildren<{
    fade?: boolean;
    // TODO(thure): Restore autoScroll prop.
  }>
>;

/**
 * Scroll container that automatically scrolls to the bottom when new content is added.
 */
export const ScrollContainer = forwardRef<ScrollController, ScrollContainerProps>(
  ({ children, classNames, fade }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        scrollToBottom: () => {
          invariant(viewport);
          // NOTE: Should be instant otherwise scrollHeight might be out of date.
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
        },
      }),
      [viewport],
    );

    useEffect(() => {
      if (viewport) {
        // debugger;
      }
    }, [viewport]);

    useEffect(() => {
      console.log('[child added]');
    }, [Children.count(children)]);

    return (
      <ScrollArea.Root classNames={mx('relative flex flex-col grow overflow-hidden', classNames)}>
        {fade && viewport && (
          <div
            role='none'
            className='z-10 absolute block-start-0 inset-inline-0 bs-24 pointer-events-none bg-gradient-to-b from-[--surface-bg] to-transparent pointer-events-none'
          />
        )}
        <ScrollArea.Viewport ref={setViewport} classNames='overflow-anchored'>
          {children}
          <AnchoredOverflow.Anchor />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='vertical'>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    );
  },
);
