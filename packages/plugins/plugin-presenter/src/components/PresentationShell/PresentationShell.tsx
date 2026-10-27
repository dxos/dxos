//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEventHandler,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import * as Util from '@dxos/react-ui/Util';

/** How long the shell's size must hold still before it fades in (ms). */
const SETTLE_DURATION = 150;

/** Longest the shell waits for its size to settle (ms). */
const SETTLE_MAX_DURATION = 800;

export type PresentationShellProps = PropsWithChildren<{
  /** Fade-in/out duration (ms). */
  fadeDuration?: number;
  /** Whether the presentation is fullscreen. */
  fullscreen?: boolean;
  /** Invoked once the exit fade-out has completed. */
  onExit?: () => void;
  /** Receives keys while focus is inside the shell. */
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}>;

/**
 * Wraps presentation content with a fade-in/out transition and, when fullscreen, an ESC handler
 * that exits in a single keypress (intercepting before the deck's handler).
 */
export const PresentationShell = Util.composable<HTMLDivElement, PresentationShellProps>(
  ({ children, fadeDuration = 300, fullscreen = true, onExit, ...props }, forwardedRef) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs<HTMLDivElement>(forwardedRef, rootRef);
    const exitTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    // Guards against exiting twice; a state updater can't gate this since React double-invokes
    // updaters in dev, which would schedule the exit (and its side effects) more than once.
    const exitingRef = useRef(false);

    // Fullscreen fades in once the size settles: entering it grows the shell over several frames, and the slide (scaled
    // to it) would be seen growing. Capped, so a shell that keeps resizing still appears; inline fades in at once.
    useEffect(() => {
      const element = rootRef.current;
      if (!element || !fullscreen) {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
      }
      let settle: ReturnType<typeof setTimeout> | undefined;
      const show = () => setVisible(true);
      const restart = () => {
        clearTimeout(settle);
        settle = setTimeout(show, SETTLE_DURATION);
      };
      const cap = setTimeout(show, SETTLE_MAX_DURATION);
      const observer = new ResizeObserver(restart);
      observer.observe(element);
      restart();
      return () => {
        observer.disconnect();
        clearTimeout(settle);
        clearTimeout(cap);
      };
    }, [fullscreen]);

    // Arrow keys reach the slides only while focus is inside the shell; on the enclosing pane, the
    // deck's plank navigation and the landmark mover claim them first.
    useEffect(() => {
      if (fullscreen) {
        rootRef.current?.focus({ preventScroll: true });
      }
    }, [fullscreen]);

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
    // Only while fullscreen: in a companion, ESC belongs to the rest of the app.
    useEffect(() => {
      if (!fullscreen) {
        return;
      }

      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          handleExit();
        }
      };

      document.addEventListener('keydown', handler, { capture: true });
      return () => document.removeEventListener('keydown', handler, { capture: true });
    }, [fullscreen, handleExit]);

    return (
      <div
        {...Util.composableProps(props, {
          classNames: [
            'relative grow overflow-hidden bg-black transition-opacity outline-none',
            visible && !exiting ? 'opacity-100' : 'opacity-0',
          ],
          style: { transitionDuration: `${fadeDuration}ms` },
        })}
        tabIndex={-1}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
