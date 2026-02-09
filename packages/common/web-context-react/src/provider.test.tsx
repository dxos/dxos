//
// Copyright 2025 DXOS.org
//

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ContextRequestEvent, createContext } from '@dxos/web-context';

import { ContextProtocolProvider } from './provider';

describe('ContextProtocolProvider', () => {
  afterEach(() => {
    cleanup();
  });

  const ctx = createContext<string>('test-context');

  test('provides context value to DOM consumers via event', () => {
    render(
      <ContextProtocolProvider context={ctx} value='test-value'>
        <div data-testid='child' />
      </ContextProtocolProvider>,
    );

    const child = screen.getByTestId('child');
    const callback = vi.fn();
    const event = new ContextRequestEvent(ctx, callback, { target: child });

    const dispatched = child.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith('test-value');
    expect(dispatched).toBe(true); // stopImmediatePropagation does not prevent default
  });

  test('updates subscribers when value changes', async () => {
    const callback = vi.fn();

    const TestComponent = () => {
      const [value, setValue] = useState('initial');
      return (
        <div>
          <button onClick={() => setValue('updated')}>Update</button>
          <ContextProtocolProvider context={ctx} value={value}>
            <div data-testid='child' />
          </ContextProtocolProvider>
        </div>
      );
    };

    render(<TestComponent />);

    const child = screen.getByTestId('child');
    child.dispatchEvent(new ContextRequestEvent(ctx, callback, { subscribe: true, target: child }));

    expect(callback).toHaveBeenCalledWith('initial', expect.any(Function));

    // trigger update
    screen.getByText('Update').click();

    // Wait for effect
    await screen.findByText('Update'); // just to wait for re-render if needed? actually click is sync but effect is slightly async.
    // In React 18, updates are batched.

    // We expect the callback to be called with new value.
    // Since we used useState, the re-render happens.
    // The provider's useEffect sees the new value and calls subscribers.

    // Check if callback called again
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith('updated', expect.any(Function));
    });
  });

  test('handles nested providers', () => {
    const callback = vi.fn();

    render(
      <ContextProtocolProvider context={ctx} value='outer'>
        <ContextProtocolProvider context={ctx} value='inner'>
          <div data-testid='child' />
        </ContextProtocolProvider>
      </ContextProtocolProvider>,
    );

    const child = screen.getByTestId('child');
    child.dispatchEvent(new ContextRequestEvent(ctx, callback, { target: child }));

    expect(callback).toHaveBeenCalledWith('inner');
  });

  test('passes requests for other contexts to parent', () => {
    const otherCtx = createContext<string>('other');
    const callback = vi.fn();

    render(
      <ContextProtocolProvider context={otherCtx} value='other-value'>
        <ContextProtocolProvider context={ctx} value='test-value'>
          <div data-testid='child' />
        </ContextProtocolProvider>
      </ContextProtocolProvider>,
    );

    const child = screen.getByTestId('child');
    child.dispatchEvent(new ContextRequestEvent(otherCtx, callback, { target: child }));

    expect(callback).toHaveBeenCalledWith('other-value');
  });
});
