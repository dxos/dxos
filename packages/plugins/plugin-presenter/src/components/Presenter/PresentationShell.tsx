//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type PresentationShellProps = PropsWithChildren<{
  /** Invoked once the exit fade-out has completed. */
  onExit?: () => void;
  /** Fade-in/out duration (ms). */
  fadeDuration?: number;
  /** Duration the [ESC] hint remains visible (ms). */
  hintDuration?: number;
}>;

/**
 * Wraps presentation content with a fade-in/out transition, an ESC handler that exits in a
 * single keypress (intercepting before the deck's fullscreen handler), and a transient [ESC]
 * caption shown on enter.
 */
export const PresentationShell = composable<HTMLDivElement, PresentationShellProps>(
  ({ children, onExit, fadeDuration = 300, hintDuration = 3000, ...props }, forwardedRef) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [showHint, setShowHint] = useState(true);
    const exitTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    // Guards against exiting twice; a state updater can't gate this since React double-invokes
    // updaters in dev, which would schedule the exit (and its side effects) more than once.
    const exitingRef = useRef(false);

    // Fade in once mounted.
    useEffect(() => {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }, []);

    // Hide the hint after the configured duration.
    useEffect(() => {
      const timer = setTimeout(() => setShowHint(false), hintDuration);
      return () => clearTimeout(timer);
    }, [hintDuration]);

    const handleExit = useCallback(() => {
      if (exitingRef.current) {
        return;
      }
      exitingRef.current = true;
      setExiting(true);
      setVisible(false);
      exitTimeout.current = setTimeout(() => onExit?.(), fadeDuration);
    }, [onExit, fadeDuration]);

    useEffect(() => () => clearTimeout(exitTimeout.current), []);

    // Capture ESC before the deck/reveal handlers so a single keypress exits directly.
    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          handleExit();
        }
      };

      document.addEventListener('keydown', handler, { capture: true });
      return () => document.removeEventListener('keydown', handler, { capture: true });
    }, [handleExit]);

    return (
      <div
        {...composableProps(props, {
          classNames: [
            'relative grow overflow-hidden bg-black transition-opacity',
            visible && !exiting ? 'opacity-100' : 'opacity-0',
          ],
          style: { transitionDuration: `${fadeDuration}ms` },
        })}
        ref={forwardedRef}
      >
        {children}

        <div
          className={mx(
            'absolute top-4 left-4 z-[300] transition-opacity duration-500',
            showHint && !exiting ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className='rounded-sm bg-white/10 px-2 py-1 font-mono text-sm text-white/70'>[ESC]</span>
        </div>
      </div>
    );
  },
);
