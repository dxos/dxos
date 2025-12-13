//
// Copyright 2025 DXOS.org
//

import {
  type Accessor,
  type JSX,
  createEffect,
  createContext as createSolidContext,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';

import {
  CONTEXT_PROVIDER_EVENT,
  CONTEXT_REQUEST_EVENT,
  type ContextCallback,
  ContextProviderEvent,
  ContextRequestEvent,
  type ContextType,
  type UnknownContext,
} from './protocol';

/**
 * Handler function type for context requests passed via SolidJS context
 */
type ContextRequestHandler = (event: ContextRequestEvent<UnknownContext>) => boolean;

/**
 * Internal SolidJS context for passing context request handlers down the tree.
 * This allows useWebComponentContext to work synchronously in SolidJS.
 */
const ContextRequestHandlerContext = createSolidContext<ContextRequestHandler | undefined>();

/**
 * Try to handle a context request using the SolidJS context chain.
 * Returns true if handled, false otherwise.
 * Used internally by useWebComponentContext.
 */
export function tryHandleContextRequest(event: ContextRequestEvent<UnknownContext>): boolean {
  const handler = useContext(ContextRequestHandlerContext);
  if (handler) {
    return handler(event);
  }
  return false;
}

/**
 * Get the context request handler from SolidJS context.
 * Used internally by useWebComponentContext.
 */
export function getContextRequestHandler(): ContextRequestHandler | undefined {
  return useContext(ContextRequestHandlerContext);
}

/**
 * Props for the ContextProtocolProvider component
 */
export interface ContextProtocolProviderProps<T extends UnknownContext> {
  /** The context key to provide */
  context: T;
  /** The value to provide - can be a static value or an accessor for reactive updates */
  value: ContextType<T> | Accessor<ContextType<T>>;
  /** Child elements */
  children: JSX.Element;
}

/**
 * A provider component that:
 * 1. Handles context-request events from web components (via DOM events)
 * 2. Handles context requests from SolidJS consumers (via SolidJS context)
 * 3. Supports subscriptions for reactive updates
 * 4. Uses WeakRef for subscriptions to prevent memory leaks
 */
export function ContextProtocolProvider<T extends UnknownContext>(props: ContextProtocolProviderProps<T>): JSX.Element {
  // Get parent handler if one exists (for nested providers)
  const parentHandler = useContext(ContextRequestHandlerContext);

  // Track subscriptions with their stable unsubscribe functions and consumer host elements
  // We use WeakMap to hold callbacks weakly. This ensures that if a consumer
  // drops the callback, we don't leak memory.
  //
  // NOTE: This means consumers MUST retain the callback reference as long as they
  // want to receive updates (e.g. implicitly via closure in a retained component).
  interface SubscriptionInfo {
    unsubscribe: () => void;
    consumerHost: Element;
    // Store ref to allow cleaning up the Set when unsubscribing
    ref: WeakRef<ContextCallback<ContextType<T>>>;
  }
  const subscriptions = new WeakMap<ContextCallback<ContextType<T>>, SubscriptionInfo>();
  const subscriptionRefs = new Set<WeakRef<ContextCallback<ContextType<T>>>>();

  // Helper to get current value (handles both static and accessor)
  const getValue = (): ContextType<T> => {
    const v = props.value;
    return typeof v === 'function' ? (v as Accessor<ContextType<T>>)() : v;
  };

  // Core handler logic - used by both DOM events and SolidJS context
  const handleRequest = (event: ContextRequestEvent<UnknownContext>): boolean => {
    // Check if this provider handles this context (strict equality per spec)
    if (event.context !== props.context) {
      // Pass to parent handler if we don't handle this context
      if (parentHandler) {
        return parentHandler(event);
      }
      return false;
    }

    const currentValue = getValue();

    if (event.subscribe) {
      // Store the callback for future updates
      const callback = event.callback as ContextCallback<ContextType<T>>;

      // Get the consumer host element from the event
      // Fallback to composedPath()[0] if contextTarget is missing (standard compliance)
      const consumerHost = event.contextTarget || (event.composedPath()[0] as Element);

      // Create a stable unsubscribe function for this callback
      // IMPORTANT: We must pass the SAME unsubscribe function each time we call the callback
      // Lit's ContextConsumer compares unsubscribe functions and calls the old one if different
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

      // Invoke callback with current value and unsubscribe function
      event.callback(currentValue, unsubscribe);
    } else {
      // One-time request - just provide the value
      event.callback(currentValue);
    }

    return true;
  };

  // Handle DOM context-request events (for web components)
  const handleContextRequestEvent = (e: Event) => {
    const event = e as ContextRequestEvent<UnknownContext>;
    if (handleRequest(event)) {
      // Stop propagation per spec recommendation
      event.stopImmediatePropagation();
    }
  };

  // Handle context-provider events from child providers
  // When a new provider appears below us, we re-dispatch our subscriptions
  // so consumers can re-parent to the closer provider
  const handleContextProviderEvent = (e: Event) => {
    const event = e as ContextProviderEvent<UnknownContext>;

    // Only handle events for our context
    if (event.context !== props.context) {
      return;
    }

    // Don't handle our own event
    if (containerRef && event.contextTarget === containerRef) {
      return;
    }

    // Re-dispatch context requests from our subscribers
    // They may now have a closer provider
    // Iterate over weak refs to re-dispatch
    // We use a separate Set of WeakRefs because WeakMap is not iterable.
    // This allows us to re-parent subscriptions when a new provider appears.
    const seen = new Set<ContextCallback<ContextType<T>>>();
    for (const ref of subscriptionRefs) {
      const callback = ref.deref();
      if (!callback) {
        subscriptionRefs.delete(ref);
        continue;
      }

      const info = subscriptions.get(callback);
      if (!info) continue;

      const { consumerHost } = info;

      // Prevent infinite loops with duplicate callbacks
      if (seen.has(callback)) {
        continue;
      }
      seen.add(callback);

      // Re-dispatch the context request from the consumer
      // We explicitly pass the original consumerHost as the target to preserve the causal chain
      consumerHost.dispatchEvent(
        new ContextRequestEvent(props.context, callback, { subscribe: true, target: consumerHost }),
      );
    }

    // Stop propagation - we've handled the re-parenting
    event.stopPropagation();
  };

  // Set up effect to notify subscribers when value changes
  let isFirstRun = true;
  createEffect(() => {
    // IMPORTANT: We must call the accessor DIRECTLY inside the effect to establish tracking
    // Reading props.value gives us the accessor, then we must call it to track the signal
    const v = props.value;
    const newValue = typeof v === 'function' ? (v as Accessor<ContextType<T>>)() : v;

    // Skip first run - only notify on changes after initial subscription
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }

    // Notify all subscribers with their stable unsubscribe functions
    for (const ref of subscriptionRefs) {
      const callback = ref.deref();
      if (!callback) {
        subscriptionRefs.delete(ref);
        continue;
      }

      const info = subscriptions.get(callback);
      if (info) {
        callback(newValue, info.unsubscribe);
      }
    }
  });

  // Reference to container element for event listener
  let containerRef: HTMLDivElement | undefined;

  // Set up event listeners when element is created
  const setupListeners = (el: HTMLDivElement) => {
    containerRef = el;
    el.addEventListener(CONTEXT_REQUEST_EVENT, handleContextRequestEvent);
    el.addEventListener(CONTEXT_PROVIDER_EVENT, handleContextProviderEvent);
  };

  // Announce this provider when mounted
  // This allows ContextRoot implementations to replay pending requests
  // and allows parent providers to re-parent their subscriptions
  onMount(() => {
    if (containerRef) {
      containerRef.dispatchEvent(new ContextProviderEvent(props.context, containerRef));
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    if (containerRef) {
      containerRef.removeEventListener(CONTEXT_REQUEST_EVENT, handleContextRequestEvent);
      containerRef.removeEventListener(CONTEXT_PROVIDER_EVENT, handleContextProviderEvent);
    }
    // WeakMap clears itself, but we should clear the Set of refs
    subscriptionRefs.clear();
  });

  return (
    <ContextRequestHandlerContext.Provider value={handleRequest}>
      <div ref={setupListeners} style={{ display: 'contents' }}>
        {props.children}
      </div>
    </ContextRequestHandlerContext.Provider>
  );
}
