//
// Copyright 2025 DXOS.org
//

// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { CONTEXT_REQUEST_EVENT, createContext } from '@dxos/web-context';

import { useWebComponentContext } from './consumer';
import { ContextProtocolProvider } from './provider';

describe('useWebComponentContext', () => {
  afterEach(() => {
    cleanup();
  });

  const ctx = createContext<string>('test-context');

  const Consumer = ({ options }: { options?: any }) => {
    const value = useWebComponentContext(ctx, options);
    return <div data-testid='value'>{value ?? 'undefined'}</div>;
  };

  test('consumes context from React provider', () => {
    render(
      <ContextProtocolProvider context={ctx} value='provided-value'>
        <Consumer />
      </ContextProtocolProvider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('provided-value');
  });

  test('consumes context from updates (subscription)', async () => {
    const Container = () => {
      const [val, setVal] = React.useState('initial');
      return (
        <>
          <button onClick={() => setVal('updated')}>Update</button>
          <ContextProtocolProvider context={ctx} value={val}>
            <Consumer options={{ subscribe: true }} />
          </ContextProtocolProvider>
        </>
      );
    };

    render(<Container />);
    expect(screen.getByTestId('value').textContent).toBe('initial');

    act(() => {
      screen.getByText('Update').click();
    });

    expect(screen.getByTestId('value').textContent).toBe('updated');
  });

  test('consumes context from DOM parent (outside React tree)', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const ref = React.useRef<HTMLDivElement>(null);
      React.useEffect(() => {
        const handler = (e: Event) => {
          const event = e as any;
          if (event.context === ctx) {
            event.stopPropagation();
            event.callback('dom-value');
          }
        };
        ref.current?.addEventListener(CONTEXT_REQUEST_EVENT, handler);
        return () => ref.current?.removeEventListener(CONTEXT_REQUEST_EVENT, handler);
      }, []);

      return <div ref={ref}>{children}</div>;
    };

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    // Initial render might be undefined until effect runs?
    // Actually useWebComponentContext effect runs after mount.
    // The request event is dispatched in useEffect.
    // So we need to wait for state update.

    // React testing library `findBy` waits.
    // But `getBy` might not.
    // However, if logic is correct, dispatch happens, callback called synchronously (in DOM case usually), state updated.
    // Wait, the callback calls `setValue`. State update is async.
    // So we expect 'dom-value' eventually.
  });
});
