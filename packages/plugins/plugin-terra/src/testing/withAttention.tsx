//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useRef } from 'react';

import { AttendableContainer, RootAttentionProvider } from '@dxos/react-ui-attention';

/** Attendable id shared by a story's container and whatever it passes as `attendableId`. */
export const STORY_ATTENDABLE_ID = 'story';

const Attended = ({ id, children }: PropsWithChildren<{ id: string }>) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Attention follows focus, so something inside takes it on mount; otherwise the story would open
  // with an unattended (and therefore disabled) toolbar until it was clicked. The container itself
  // cannot take it — `contents` leaves it without a box, and an element with no box is not
  // focusable — so the first focusable descendant does, which the attention manager walks up from.
  useEffect(() => {
    const container = containerRef.current;
    // Deferred a frame: the story's own subtree is not in the DOM yet when this effect first runs,
    // so there is nothing to focus until it is.
    const handle = requestAnimationFrame(() => {
      const focusable = container?.querySelector<HTMLElement>(
        '[tabindex]:not([tabindex="-1"]), button:not([disabled]), input, select, textarea',
      );
      focusable?.focus();
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <AttendableContainer ref={containerRef} id={id} tabIndex={0} classNames='contents'>
      {children}
    </AttendableContainer>
  );
};

/**
 * Puts a story's content in an attended container. In the app the deck owns attention; on its own a
 * story has nothing that does, and `Menu.Toolbar` disables itself whenever its attendable is
 * unattended — so without this every toolbar in a story renders greyed out and inert.
 */
export const withAttention =
  (id: string = STORY_ATTENDABLE_ID): Decorator =>
  (Story) => (
    <RootAttentionProvider>
      <Attended id={id}>
        <Story />
      </Attended>
    </RootAttentionProvider>
  );
