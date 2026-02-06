//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';

/**
 * Hook to handle iOS keyboard events and set CSS custom properties.
 *
 * On iOS (Tauri), listens for 'keyboard' CustomEvents dispatched by the native KeyboardObserver.swift.
 * Falls back to VisualViewport API on other platforms.
 *
 * Sets CSS custom properties:
 * - --vvh: Visual viewport height adjusted for keyboard.
 * - --kb-height: Keyboard height in pixels.
 * - --kb-open: 1 when open, 0 when closed.
 */
export const useIOSKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateState = (height: number, open: boolean) => {
      setKeyboardHeight(height);
      setIsOpen(open);

      console.log(window.innerHeight, height, window.innerHeight - height);
      document.documentElement.style.setProperty('--vvh', `${window.innerHeight - height}px`);
      document.documentElement.style.setProperty('--kb-height', `${height}px`);
      document.documentElement.style.setProperty('--kb-open', open ? '1' : '0');
    };

    // Handler for native iOS keyboard events (from KeyboardObserver.swift).
    const handleKeyboardEvent = (event: CustomEvent<{ type: 'show' | 'hide'; height: number; duration: number }>) => {
      const { type, height } = event.detail;
      log.info('[useIOSKeyboard] Keyboard event:', { type, height });
      updateState(height, type === 'show');
    };

    // Handler for VisualViewport resize (fallback for non-iOS).
    let initialHeight = window.visualViewport?.height ?? window.innerHeight;

    const handleViewportResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        return;
      }

      const heightDiff = initialHeight - viewport.height;
      const open = heightDiff > 100;

      if (open) {
        updateState(heightDiff, true);
      } else if (heightDiff < 50) {
        updateState(0, false);
        initialHeight = viewport.height;
      }
    };

    // Listen for native keyboard events.
    window.addEventListener('keyboard', handleKeyboardEvent as EventListener);

    // Also listen for VisualViewport as fallback.
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      window.removeEventListener('keyboard', handleKeyboardEvent as EventListener);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  return { keyboardHeight, isOpen };
};
