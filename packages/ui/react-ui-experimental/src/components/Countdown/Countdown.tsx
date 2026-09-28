//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type CountdownOptions, playCountdown } from './play-countdown.ts';

export type CountdownProps = ThemedClassName<
  CountdownOptions & {
    /** Called once the count has run out and faded. */
    onComplete?: () => void;
  }
>;

/**
 * A closed ring with a play triangle, then a 3-2-1 count inside the ring as it unwinds: the cue a recording
 * starts on. The DOM and styles live in `play-countdown.ts` so autocue's driver can inject the same countdown into
 * pages without React.
 */
export const Countdown = ({ classNames, from, wait, onComplete }: CountdownProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const host = ref.current;
    if (!host) {
      return;
    }

    // A shadow root keeps the countdown's class names from meeting the app's styles.
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    // Aborting settles a pending wait for the click, so an unmounted countdown does not linger.
    const controller = new AbortController();
    void playCountdown(root, { from, wait, signal: controller.signal }).then(() => {
      if (!controller.signal.aborted) {
        onCompleteRef.current?.();
      }
    });
    return () => {
      controller.abort();
      root.replaceChildren();
    };
  }, [from, wait]);

  return <div ref={ref} className={mx(classNames)} />;
};
