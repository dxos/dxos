//
// Copyright 2025 DXOS.org
//

import { cleanup, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { CONTEXT_REQUEST_EVENT, ContextRequestEvent, createContext } from '@dxos/web-context';
import { ContextProtocolProvider } from './provider';

describe('ContextProtocolProvider', () => {
  // Clean up after each test
  afterEach(() => {
    cleanup();
  });

  test('renders children', () => {
    const ctx = createContext<string>('test');

    const { getByText } = render(() => (
      <ContextProtocolProvider context={ctx} value='hello'>
        <span>Child Content</span>
      </ContextProtocolProvider>
    ));

    expect(getByText('Child Content')).toBeInTheDocument();
  });

  test('responds to context-request events with matching context', async () => {
    const ctx = createContext<string>('test');
    const callback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value='provided-value'>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith('provided-value');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('ignores context-request events with non-matching context', () => {
    const ctx1 = createContext<string>('ctx1');
    const ctx2 = createContext<string>('ctx2');
    const callback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx1} value='value1'>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx2, callback, { target: child });
    child.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  test('stops immediate propagation when handling request', () => {
    const ctx = createContext<string>('test');
    const callback = vi.fn();
    const outerHandler = vi.fn();

    const { container } = render(() => (
      <div>
        <ContextProtocolProvider context={ctx} value='inner-value'>
          <div data-testid='child'>Child</div>
        </ContextProtocolProvider>
      </div>
    ));

    // Add outer listener
    container.addEventListener(CONTEXT_REQUEST_EVENT, outerHandler);

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith('inner-value');
    expect(outerHandler).not.toHaveBeenCalled();

    container.removeEventListener(CONTEXT_REQUEST_EVENT, outerHandler);
  });

  test('provides unsubscribe callback for subscriptions', () => {
    const ctx = createContext<number>('counter');
    const callback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value={42}>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { subscribe: true, target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith(42, expect.any(Function));
  });

  test('does not provide unsubscribe for non-subscription requests', () => {
    const ctx = createContext<number>('counter');
    const callback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value={42}>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { subscribe: false, target: child });
    child.dispatchEvent(event);

    // Should be called with just the value (no unsubscribe)
    expect(callback).toHaveBeenCalledWith(42);
    expect(callback.mock.calls[0].length).toBe(1);
  });

  test('notifies subscribers when value changes (reactive accessor)', async () => {
    const ctx = createContext<number>('counter');
    const callback = vi.fn();
    const [count, setCount] = createSignal(0);

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value={count}>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { subscribe: true, target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith(0, expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(1);

    // Update the value
    setCount(1);

    // Wait for effect to run
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith(1, expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(2);

    // Update again
    setCount(2);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith(2, expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test('unsubscribe stops updates', async () => {
    const ctx = createContext<number>('counter');
    const callback = vi.fn();
    const [count, setCount] = createSignal(0);

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value={count}>
        <div data-testid='child'>Child</div>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;

    let unsubscribeFn: (() => void) | undefined;
    const wrappedCallback = (value: number, unsubscribe?: () => void) => {
      callback(value, unsubscribe);
      unsubscribeFn = unsubscribe;
    };

    const event = new ContextRequestEvent(ctx, wrappedCallback, { subscribe: true, target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribeFn!();

    // Update the value
    setCount(1);
    await Promise.resolve();

    // Should not have received update
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('nested providers - inner provider handles matching context', () => {
    const ctx = createContext<string>('test');
    const callback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value='outer'>
        <ContextProtocolProvider context={ctx} value='inner'>
          <div data-testid='child'>Child</div>
        </ContextProtocolProvider>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;
    const event = new ContextRequestEvent(ctx, callback, { target: child });
    child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith('inner');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('multiple contexts can be provided simultaneously', () => {
    const themeCtx = createContext<string>('theme');
    const userCtx = createContext<{ name: string }>('user');
    const themeCallback = vi.fn();
    const userCallback = vi.fn();

    const { container } = render(() => (
      <ContextProtocolProvider context={themeCtx} value='dark'>
        <ContextProtocolProvider context={userCtx} value={{ name: 'Alice' }}>
          <div data-testid='child'>Child</div>
        </ContextProtocolProvider>
      </ContextProtocolProvider>
    ));

    const child = container.querySelector('[data-testid="child"]')!;

    child.dispatchEvent(new ContextRequestEvent(themeCtx, themeCallback, { target: child }));
    child.dispatchEvent(new ContextRequestEvent(userCtx, userCallback, { target: child }));

    expect(themeCallback).toHaveBeenCalledWith('dark');
    expect(userCallback).toHaveBeenCalledWith({ name: 'Alice' });
  });

  test('wrapper div uses display: contents', () => {
    const ctx = createContext<string>('test');

    const { container } = render(() => (
      <ContextProtocolProvider context={ctx} value='value'>
        <span>Child</span>
      </ContextProtocolProvider>
    ));

    const wrapperDiv = container.querySelector('div');
    expect(wrapperDiv).toHaveStyle({ display: 'contents' });
  });
});
