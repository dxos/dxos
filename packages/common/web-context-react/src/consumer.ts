//
// Copyright 2025 DXOS.org
//

import { useContext, useEffect, useState } from 'react';

import { ContextRequestEvent, type ContextType, type UnknownContext } from '@dxos/web-context';

import { HostElementContext } from './internal';
import { useContextRequestHandler } from './provider';

/**
 * Options for useWebComponentContext hook
 */
export interface UseWebComponentContextOptions {
  /**
   * Whether to subscribe to context updates.
   * If true, the returned value will update when the provider's value changes.
   * Default: false
   */
  subscribe?: boolean;

  /**
   * The element to dispatch the context-request event from.
   * This is only used when there's no React provider in the tree.
   * Default: document.body
   */
  element?: HTMLElement;
}

/**
 * A React hook that requests context using the Web Component Context Protocol.
 *
 * This first tries to use the React context chain (for providers in the same
 * React tree), then falls back to dispatching a DOM event (for web component
 * providers).
 *
 * @param context - The context key to request
 * @param options - Optional configuration
 * @returns The context value or undefined
 */
export function useWebComponentContext<T extends UnknownContext>(
  context: T,
  options?: UseWebComponentContextOptions,
): ContextType<T> | undefined {
  const [value, setValue] = useState<ContextType<T> | undefined>(undefined);

  const handler = useContextRequestHandler();
  const hostElement = useContext(HostElementContext);

  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined;

    const callback = (newValue: ContextType<T>, unsubscribe?: () => void) => {
      setValue(newValue);
      if (unsubscribe) {
        unsubscribeFn = unsubscribe;
      }
    };

    const targetElement = options?.element ?? hostElement ?? document.body;

    const event = new ContextRequestEvent(context, callback, {
      subscribe: options?.subscribe,
      target: targetElement,
    });

    let handled = false;
    if (handler) {
      handled = handler(event);
    }

    if (!handled) {
      targetElement.dispatchEvent(event);
    }

    return () => {
      unsubscribeFn?.();
    };
  }, [context, options?.subscribe, options?.element, handler, hostElement]);

  return value;
}
