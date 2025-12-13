//
// Copyright 2025 DXOS.org
//

import { type Accessor, createSignal, onCleanup } from 'solid-js';

import { getHostElement } from './internal';
import { ContextRequestEvent, type ContextType, type UnknownContext } from './protocol';
import { getContextRequestHandler } from './provider';

/**
 * Options for useWebComponentContext hook
 */
export interface UseWebComponentContextOptions {
  /**
   * Whether to subscribe to context updates.
   * If true, the returned signal will update when the provider's value changes.
   * Default: false
   */
  subscribe?: boolean;

  /**
   * The element to dispatch the context-request event from.
   * This is only used when there's no SolidJS provider in the tree.
   * Default: document.body
   */
  element?: HTMLElement;
}

/**
 * A SolidJS hook that requests context using the Web Component Context Protocol.
 *
 * This first tries to use the SolidJS context chain (for providers in the same
 * SolidJS tree), then falls back to dispatching a DOM event (for web component
 * providers).
 *
 * @param context - The context key to request
 * @param options - Optional configuration
 * @returns An accessor that returns the context value or undefined
 *
 * @example
 * ```tsx
 * const theme = useWebComponentContext(themeContext);
 * return <div style={{ color: theme()?.primary }}>Hello</div>;
 * ```
 *
 * @example
 * ```tsx
 * // Subscribe to updates
 * const theme = useWebComponentContext(themeContext, { subscribe: true });
 * return <div style={{ color: theme()?.primary }}>Hello</div>;
 * ```
 */
export function useWebComponentContext<T extends UnknownContext>(
  context: T,
  options?: UseWebComponentContextOptions,
): Accessor<ContextType<T> | undefined> {
  const [value, setValue] = createSignal<ContextType<T> | undefined>(undefined);
  let unsubscribeFn: (() => void) | undefined;

  // Create callback that updates our signal
  const callback = (newValue: ContextType<T>, unsubscribe?: () => void): void => {
    setValue(() => newValue);
    // Store the latest unsubscribe function
    if (unsubscribe) {
      unsubscribeFn = unsubscribe;
    }
  };

  // Determine the target element for the context request
  // Use: 1) explicit element option, 2) host element from custom element context, 3) document.body
  const hostElement = getHostElement();
  const targetElement = options?.element ?? hostElement ?? document.body;

  // Create the context request event with contextTarget for proper re-parenting support
  const event = new ContextRequestEvent(context, callback, {
    subscribe: options?.subscribe,
    target: targetElement,
  });

  // First, try to handle via SolidJS context chain (synchronous)
  const handler = getContextRequestHandler();
  let handled = false;

  if (handler) {
    handled = handler(event);
  }

  // If not handled by SolidJS providers, try DOM event dispatch
  if (!handled) {
    targetElement.dispatchEvent(event);
  }

  // Cleanup: unsubscribe when component unmounts
  // Cleanup: unsubscribe when component unmounts
  onCleanup(() => {
    unsubscribeFn?.();
  });

  return value;
}
