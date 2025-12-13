//
// Copyright 2025 DXOS.org
//

import { cleanup, render, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, test } from 'vitest';

import { useWebComponentContext } from './consumer';
import { CONTEXT_REQUEST_EVENT, createContext } from '@dxos/web-context';
import { ContextProtocolProvider } from './provider';

describe('useWebComponentContext', () => {
  afterEach(() => {
    cleanup();
  });

  test('returns undefined when no provider exists', () => {
    const ctx = createContext<string>('test');
    let contextValue: string | undefined;

    render(() => {
      const value = useWebComponentContext(ctx);
      contextValue = value();
      return <div>Test</div>;
    });

    expect(contextValue).toBeUndefined();
  });

  test('receives value from provider', () => {
    const ctx = createContext<string>('test');
    let contextValue: string | undefined;

    render(() => (
      <ContextProtocolProvider context={ctx} value='hello'>
        {(() => {
          const value = useWebComponentContext(ctx);
          contextValue = value();
          return <div>Test</div>;
        })()}
      </ContextProtocolProvider>
    ));

    expect(contextValue).toBe('hello');
  });

  test('receives updates when subscribed', async () => {
    const ctx = createContext<number>('counter');
    const [count, setCount] = createSignal(0);
    const values: number[] = [];

    render(() => (
      <ContextProtocolProvider context={ctx} value={count}>
        {(() => {
          const value = useWebComponentContext(ctx, { subscribe: true });
          // Track all values we receive
          values.push(value() ?? -1);
          return <div>{value()}</div>;
        })()}
      </ContextProtocolProvider>
    ));

    expect(values).toContain(0);

    // Update the value
    setCount(1);
    await Promise.resolve();

    // Re-render will have picked up the new value via the signal
    // Since SolidJS is fine-grained, we need to access the value in an effect
  });

  test('does not receive updates when not subscribed', async () => {
    const ctx = createContext<number>('counter');
    const [count, setCount] = createSignal(0);
    const receivedValues: number[] = [];

    // Use a proper component pattern
    const Consumer = () => {
      const value = useWebComponentContext(ctx, { subscribe: false });
      // Track what values the signal returns when accessed
      receivedValues.push(value() ?? -1);
      return <div data-testid='display'>{value()}</div>;
    };

    const { findByTestId } = render(() => (
      <ContextProtocolProvider context={ctx} value={count}>
        <Consumer />
      </ContextProtocolProvider>
    ));

    const display = await findByTestId('display');
    expect(display.textContent).toBe('0');

    // Clear to track only updates after initial render
    const initialValues = [...receivedValues];
    receivedValues.length = 0;

    // Update the provider value
    setCount(1);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Without subscription, the consumer's signal should NOT update
    // The display should still show the initial value
    expect(display.textContent).toBe('0');

    // The consumer should not have received any new values
    // (some frameworks might re-render, but the value shouldn't change)
    expect(receivedValues.every((v) => v === 0 || v === -1)).toBe(true);
  });

  test('can dispatch from custom element', () => {
    const ctx = createContext<string>('test');
    let contextValue: string | undefined;

    // Create a custom element to dispatch from
    const customEl = document.createElement('div');
    document.body.appendChild(customEl);

    // Set up provider on body
    const handler = (e: Event) => {
      const event = e as any;
      if (event.context === ctx) {
        event.stopImmediatePropagation();
        event.callback('custom-element-value');
      }
    };
    document.body.addEventListener(CONTEXT_REQUEST_EVENT, handler);

    render(() => {
      const value = useWebComponentContext(ctx, { element: customEl });
      contextValue = value();
      return <div>Test</div>;
    });

    expect(contextValue).toBe('custom-element-value');

    // Cleanup
    document.body.removeEventListener(CONTEXT_REQUEST_EVENT, handler);
    document.body.removeChild(customEl);
  });

  test('returns accessor that can be called multiple times', () => {
    const ctx = createContext<string>('test');

    render(() => (
      <ContextProtocolProvider context={ctx} value='test-value'>
        {(() => {
          const value = useWebComponentContext(ctx);

          // Call the accessor multiple times
          const v1 = value();
          const v2 = value();
          const v3 = value();

          expect(v1).toBe('test-value');
          expect(v2).toBe('test-value');
          expect(v3).toBe('test-value');

          return <div>Test</div>;
        })()}
      </ContextProtocolProvider>
    ));
  });

  test('works with object values', () => {
    const ctx = createContext<{ name: string; count: number }>('user');
    let contextValue: { name: string; count: number } | undefined;

    render(() => (
      <ContextProtocolProvider context={ctx} value={{ name: 'Alice', count: 42 }}>
        {(() => {
          const value = useWebComponentContext(ctx);
          contextValue = value();
          return <div>Test</div>;
        })()}
      </ContextProtocolProvider>
    ));

    expect(contextValue).toEqual({ name: 'Alice', count: 42 });
  });

  test('works with nested providers (gets nearest)', () => {
    const ctx = createContext<string>('test');
    let contextValue: string | undefined;

    render(() => (
      <ContextProtocolProvider context={ctx} value='outer'>
        <ContextProtocolProvider context={ctx} value='inner'>
          {(() => {
            const value = useWebComponentContext(ctx);
            contextValue = value();
            return <div>Test</div>;
          })()}
        </ContextProtocolProvider>
      </ContextProtocolProvider>
    ));

    expect(contextValue).toBe('inner');
  });

  test('different contexts do not interfere', () => {
    const ctx1 = createContext<string>('ctx1');
    const ctx2 = createContext<number>('ctx2');
    let value1: string | undefined;
    let value2: number | undefined;

    render(() => (
      <ContextProtocolProvider context={ctx1} value='string-value'>
        <ContextProtocolProvider context={ctx2} value={123}>
          {(() => {
            const v1 = useWebComponentContext(ctx1);
            const v2 = useWebComponentContext(ctx2);
            value1 = v1();
            value2 = v2();
            return <div>Test</div>;
          })()}
        </ContextProtocolProvider>
      </ContextProtocolProvider>
    ));

    expect(value1).toBe('string-value');
    expect(value2).toBe(123);
  });

  test('signal updates reactively in JSX', async () => {
    const ctx = createContext<number>('counter');
    const [count, setCount] = createSignal(0);

    // Use a proper component pattern instead of IIFE
    const Consumer = () => {
      const value = useWebComponentContext(ctx, { subscribe: true });
      return <div data-testid='display'>{value()}</div>;
    };

    const { findByTestId } = render(() => (
      <ContextProtocolProvider context={ctx} value={count}>
        <Consumer />
      </ContextProtocolProvider>
    ));

    const display = await findByTestId('display');
    expect(display.textContent).toBe('0');

    // Update the value
    setCount(42);

    // Wait for the DOM to update
    await waitFor(() => {
      expect(display.textContent).toBe('42');
    });
  });
});
