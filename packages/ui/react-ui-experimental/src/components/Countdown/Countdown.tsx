//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FilmLeaderOptions, playFilmLeader } from './film-leader.ts';

export type CountdownProps = ThemedClassName<
  FilmLeaderOptions & {
    /** Called once the leader has counted down and faded out. */
    onComplete?: () => void;
  }
>;

/**
 * A play button and a 3-2-1 film leader over the viewport, the cue a recording starts on. The DOM and
 * styles live in `film-leader.ts` so autocue's driver can inject the same leader into pages without React.
 */
export const Countdown = ({ classNames, from, wait, reticle, logo, onComplete }: CountdownProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const host = ref.current;
    if (!host) {
      return;
    }

    // A shadow root keeps the leader's class names from meeting the app's styles.
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    let cancelled = false;
    void playFilmLeader(root, { from, wait, reticle, logo }).then(() => {
      if (!cancelled) {
        onCompleteRef.current?.();
      }
    });
    return () => {
      cancelled = true;
      root.replaceChildren();
    };
  }, [from, wait, reticle, logo]);

  return <div ref={ref} className={mx(classNames)} />;
};
