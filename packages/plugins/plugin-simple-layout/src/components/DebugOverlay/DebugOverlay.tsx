//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useRef } from 'react';

const DEBUG_OVERLAY_NAME = 'DebugOverlay';

//
// Context
//

type DebugOverlayContextValue = {
  /** Log a timestamped message to the on-screen debug overlay. */
  dbg: (msg: string) => void;
};

// Default to a no-op so hooks can call useDebugLog() safely outside of a provider.
const [DebugOverlayProvider, useDebugLog] = createContext<DebugOverlayContextValue>(DEBUG_OVERLAY_NAME, {
  dbg: () => {},
});

//
// Root
//

type DebugOverlayRootProps = PropsWithChildren<{
  /**
   * When true (default), renders the on-screen log panel.
   * Set to false to suppress the overlay while keeping the context available.
   */
  enabled?: boolean;
}>;

/**
 * Establishes a debug overlay context.
 *
 * When enabled, renders an on-screen monospaced log panel anchored just above
 * the keyboard (via --kb-height CSS variable). Descendants can call
 * useDebugLog() to obtain the dbg() function for logging.
 *
 * Intended for transient mobile debugging in the iOS Simulator where DevTools
 * console output may not be accessible.
 */
const DebugOverlayRoot = ({ children, enabled = true }: DebugOverlayRootProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const dbg = useCallback((msg: string) => {
    if (!overlayRef.current) {
      return;
    }
    const line = document.createElement('pre');
    line.textContent = `${(performance.now() / 1000).toFixed(2).padStart(8, ' ')} ${msg}`;
    overlayRef.current.prepend(line);
    while (overlayRef.current.children.length > 5) {
      overlayRef.current.lastChild?.remove();
    }
  }, []);

  return (
    <DebugOverlayProvider dbg={dbg}>
      {children}
      {enabled && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--kb-height, 0px) + 8px)',
            left: 8,
            right: 8,
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            fontSize: 10,
            fontFamily: 'monospace',
            padding: 6,
            borderRadius: 4,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}
    </DebugOverlayProvider>
  );
};

//
// Exports
//

export const DebugOverlay = {
  Root: DebugOverlayRoot,
};

export { useDebugLog };
