//
// Copyright 2025 DXOS.org
//

import { useCallback, useMemo } from 'react';

/**
 * Impact feedback styles for haptic feedback.
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

/**
 * Notification feedback types for haptic feedback.
 */
export type NotificationType = 'success' | 'warning' | 'error';

/**
 * Hook to trigger haptic feedback on mobile devices via Tauri.
 *
 * This hook provides methods to trigger various types of haptic feedback:
 * - impactFeedback: For button presses, UI interactions.
 * - notificationFeedback: For success/warning/error notifications.
 * - selectionFeedback: For selection changes (e.g., picker wheels).
 * - vibrate: For general vibration (primarily Android).
 *
 * On non-Tauri environments (web), the methods are no-ops.
 *
 * @returns Object with haptic feedback trigger methods and availability flag.
 */
export const useHaptics = () => {
  // Check if we're in a Tauri mobile environment.
  const isAvailable = useMemo(
    () =>
      typeof window !== 'undefined' &&
      '__TAURI__' in window &&
      // Check for mobile user agent as a heuristic.
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    [],
  );

  /**
   * Trigger impact feedback (e.g., button tap).
   */
  const impactFeedback = useCallback(
    async (style: ImpactStyle = 'medium') => {
      if (!isAvailable) {
        return;
      }

      try {
        const haptics = await import('@tauri-apps/plugin-haptics');
        await haptics.impactFeedback(style);
      } catch {
        // Silently fail on non-mobile or when plugin not available.
      }
    },
    [isAvailable],
  );

  /**
   * Trigger notification feedback (success, warning, error).
   */
  const notificationFeedback = useCallback(
    async (type: NotificationType = 'success') => {
      if (!isAvailable) {
        return;
      }

      try {
        const haptics = await import('@tauri-apps/plugin-haptics');
        await haptics.notificationFeedback(type);
      } catch {
        // Silently fail on non-mobile or when plugin not available.
      }
    },
    [isAvailable],
  );

  /**
   * Trigger selection feedback (e.g., picker wheel).
   */
  const selectionFeedback = useCallback(async () => {
    if (!isAvailable) {
      return;
    }

    try {
      const haptics = await import('@tauri-apps/plugin-haptics');
      await haptics.selectionFeedback();
    } catch {
      // Silently fail on non-mobile or when plugin not available.
    }
  }, [isAvailable]);

  /**
   * Trigger general vibration (primarily Android).
   */
  const vibrate = useCallback(
    async (duration: number = 100) => {
      if (!isAvailable) {
        return;
      }

      try {
        const haptics = await import('@tauri-apps/plugin-haptics');
        await haptics.vibrate(duration);
      } catch {
        // Silently fail on non-mobile or when plugin not available.
      }
    },
    [isAvailable],
  );

  return {
    isAvailable,
    impactFeedback,
    notificationFeedback,
    selectionFeedback,
    vibrate,
  };
};
