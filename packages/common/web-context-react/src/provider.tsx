//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef } from 'react';

import {
  CONTEXT_PROVIDER_EVENT,
  CONTEXT_REQUEST_EVENT,
  type ContextCallback,
  ContextProviderEvent,
  ContextRequestEvent,
  type ContextType,
  type UnknownContext,
} from '@dxos/web-context';

/**
 * Handler function type for context requests passed via React context
 */
type ContextRequestHandler = (event: ContextRequestEvent<UnknownContext>) => boolean;

/**
 * Internal React context for passing context request handlers down the tree.
 * This allows useWebComponentContext to work synchronously in React.
 */
const ContextRequestHandlerContext = createContext<ContextRequestHandler | undefined>(undefined);

/**
 * Try to handle a context request using the React context chain.
 * Returns true if handled, false otherwise.
 * Used internally by useWebComponentContext.
 */
export function tryHandleContextRequest(event: ContextRequestEvent<UnknownContext>): boolean {
  // This function is intended to be used where useContext is invalid (outside component),
  // but context handling in React MUST happen inside components.
  // So this helper might be less useful in React than in Solid if not used inside a hook/component.
  // However, we can export the context itself for consumers to use `useContext`.
  return false;
}

/**
 * Get the context request handler from React context.
 * Used internally by useWebComponentContext.
 */
export function useContextRequestHandler(): ContextRequestHandler | undefined {
  return useContext(ContextRequestHandlerContext);
}

/**
 * Props for the ContextProtocolProvider component
 */
export interface ContextProtocolProviderProps<T extends UnknownContext> {
  /** The context key to provide */
  context: T;
  /** The value to provide */
  value: ContextType<T>;
}

/**
 * A provider component that:
 * 1. Handles context-request events from web components (via DOM events)
 * 2. Handles context requests from React consumers (via React context)
 * 3. Supports subscriptions for reactive updates
 * 4. Uses WeakRef for subscriptions to prevent memory leaks
 */
export const ContextProtocolProvider = <T extends UnknownContext>({
  context,
  value,
  children,
}: PropsWithChildren<ContextProtocolProviderProps<T>>): JSX.Element => {
  // Get parent handler if one exists (for nested providers)
  const parentHandler = useContext(ContextRequestHandlerContext);

  // Track subscriptions with their stable unsubscribe functions and consumer host elements
  interface SubscriptionInfo {
    unsubscribe: () => void;
    consumerHost: Element;
    ref: WeakRef<ContextCallback<ContextType<T>>>;
  }

  // We use refs for mutable state that doesn't trigger re-renders
  const subscriptions = useRef(new WeakMap<ContextCallback<ContextType<T>>, SubscriptionInfo>()).current;
  const subscriptionRefs = useRef(new Set<WeakRef<ContextCallback<ContextType<T>>>>()).current;
  const valueRef = useRef(value);

  // Update value ref when prop changes
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Core handler logic
  const handleRequest = useCallback(
    (event: ContextRequestEvent<UnknownContext>): boolean => {
      if (event.context !== context) {
        if (parentHandler) {
          return parentHandler(event);
        }
        return false;
      }

      const currentValue = valueRef.current; // Use latest value

      if (event.subscribe) {
        const callback = event.callback as ContextCallback<ContextType<T>>;
        const consumerHost = event.contextTarget || (event.composedPath()[0] as Element);

        const unsubscribe = () => {
          const info = subscriptions.get(callback);
          if (info) {
            subscriptionRefs.delete(info.ref);
            subscriptions.delete(callback);
          }
        };

        const ref = new WeakRef(callback);
        subscriptions.set(callback, { unsubscribe, consumerHost, ref });
        subscriptionRefs.add(ref);

        event.callback(currentValue, unsubscribe);
      } else {
        event.callback(currentValue);
      }

      return true;
    },
    [context, parentHandler], // Dependencies
  );

  // Handle DOM context-request events
  const handleContextRequestEvent = useCallback(
    (e: Event) => {
      const event = e as ContextRequestEvent<UnknownContext>;
      if (handleRequest(event)) {
        event.stopImmediatePropagation();
      }
    },
    [handleRequest],
  );

  // Handle context-provider events
  const handleContextProviderEvent = useCallback(
    (e: Event) => {
      const event = e as ContextProviderEvent<UnknownContext>;
      if (event.context !== context) return;
      if (containerRef.current && event.contextTarget === containerRef.current) return;

      const seen = new Set<ContextCallback<ContextType<T>>>();
      for (const ref of subscriptionRefs) {
        const callback = ref.deref();
        if (!callback) {
          subscriptionRefs.delete(ref);
          continue;
        }

        const info = subscriptions.get(callback);
        if (!info) continue;

        if (seen.has(callback)) continue;
        seen.add(callback);

        info.consumerHost.dispatchEvent(
          new ContextRequestEvent(context, callback, { subscribe: true, target: info.consumerHost }),
        );
      }
      event.stopPropagation();
    },
    [context],
  );

  // Notify subscribers when value changes
  useEffect(() => {
    // Skip notification if value hasn't changed? React does this for us if we use dependencies correctly?
    // No, we need to imperatively call callbacks.
    // value constraint is in the dependency array

    for (const ref of subscriptionRefs) {
      const callback = ref.deref();
      if (!callback) {
        subscriptionRefs.delete(ref);
        continue;
      }
      const info = subscriptions.get(callback);
      if (info) {
        callback(value, info.unsubscribe);
      }
    }
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener(CONTEXT_REQUEST_EVENT, handleContextRequestEvent);
    el.addEventListener(CONTEXT_PROVIDER_EVENT, handleContextProviderEvent);

    // Announce provider
    el.dispatchEvent(new ContextProviderEvent(context, el));

    return () => {
      el.removeEventListener(CONTEXT_REQUEST_EVENT, handleContextRequestEvent);
      el.removeEventListener(CONTEXT_PROVIDER_EVENT, handleContextProviderEvent);
      subscriptionRefs.clear();
    };
  }, [handleContextRequestEvent, handleContextProviderEvent, context]);

  return (
    <ContextRequestHandlerContext.Provider value={handleRequest}>
      <div ref={containerRef} style={{ display: 'contents' }}>
        {children}
      </div>
    </ContextRequestHandlerContext.Provider>
  );
};
