//
// Copyright 2025 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import {
  CONTEXT_REQUEST_EVENT,
  type ContextCallback,
  ContextRequestEvent,
  type ContextType,
  type UnknownContext,
  createContext,
} from './protocol';

describe('protocol', () => {
  describe('createContext', () => {
    test('creates a context with string key', () => {
      const ctx = createContext<number>('my-context');
      expect(ctx).toBe('my-context');
    });

    test('creates a context with symbol key', () => {
      const key = Symbol('my-context');
      const ctx = createContext<string>(key);
      expect(ctx).toBe(key);
    });

    test('creates a context with object key', () => {
      const key = { name: 'my-context' };
      const ctx = createContext<boolean>(key);
      expect(ctx).toBe(key);
    });

    test('contexts with same string key are strictly equal', () => {
      const ctx1 = createContext<number>('shared-key');
      const ctx2 = createContext<number>('shared-key');
      expect(ctx1 === ctx2).toBe(true);
    });

    test('contexts with unique symbols are not equal', () => {
      const ctx1 = createContext<number>(Symbol('unique'));
      const ctx2 = createContext<number>(Symbol('unique'));
      expect(ctx1 === ctx2).toBe(false);
    });

    test('contexts with Symbol.for are equal', () => {
      const ctx1 = createContext<number>(Symbol.for('shared'));
      const ctx2 = createContext<number>(Symbol.for('shared'));
      expect(ctx1 === ctx2).toBe(true);
    });
  });

  describe('ContextRequestEvent', () => {
    test('creates event with correct type', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.type).toBe('context-request');
    });

    test('event bubbles', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.bubbles).toBe(true);
    });

    test('event is composed (crosses shadow DOM boundaries)', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.composed).toBe(true);
    });

    test('carries context key', () => {
      const ctx = createContext<string>('my-key');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.context).toBe(ctx);
    });

    test('carries contextTarget', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.contextTarget).toBe(target);
    });

    test('carries callback', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.callback).toBe(callback);
    });

    test('subscribe defaults to undefined', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback);

      expect(event.subscribe).toBeUndefined();
    });

    test('subscribe can be set to true', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback, true);

      expect(event.subscribe).toBe(true);
    });

    test('subscribe can be set to false', () => {
      const ctx = createContext<string>('test');
      const target = document.createElement('div');
      const callback = vi.fn();
      const event = new ContextRequestEvent(ctx, target, callback, false);

      expect(event.subscribe).toBe(false);
    });
  });

  describe('ContextRequestEvent integration', () => {
    test('event bubbles through DOM', () => {
      const ctx = createContext<string>('test');
      const callback = vi.fn();

      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const handler = vi.fn((e: Event) => {
        const event = e as ContextRequestEvent<typeof ctx>;
        if (event.context === ctx) {
          event.stopImmediatePropagation();
          event.callback('provided-value');
        }
      });

      parent.addEventListener(CONTEXT_REQUEST_EVENT, handler);

      const event = new ContextRequestEvent(ctx, child, callback);
      child.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('provided-value');

      // Cleanup
      parent.removeEventListener(CONTEXT_REQUEST_EVENT, handler);
      document.body.removeChild(parent);
    });

    test('stopImmediatePropagation prevents other handlers', () => {
      const ctx = createContext<string>('test');
      const callback = vi.fn();

      const grandparent = document.createElement('div');
      const parent = document.createElement('div');
      const child = document.createElement('div');
      grandparent.appendChild(parent);
      parent.appendChild(child);
      document.body.appendChild(grandparent);

      const parentHandler = vi.fn((e: Event) => {
        const event = e as ContextRequestEvent<typeof ctx>;
        if (event.context === ctx) {
          event.stopImmediatePropagation();
          event.callback('parent-value');
        }
      });

      const grandparentHandler = vi.fn((e: Event) => {
        const event = e as ContextRequestEvent<typeof ctx>;
        if (event.context === ctx) {
          event.callback('grandparent-value');
        }
      });

      parent.addEventListener(CONTEXT_REQUEST_EVENT, parentHandler);
      grandparent.addEventListener(CONTEXT_REQUEST_EVENT, grandparentHandler);

      const event = new ContextRequestEvent(ctx, child, callback);
      child.dispatchEvent(event);

      expect(parentHandler).toHaveBeenCalled();
      expect(grandparentHandler).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('parent-value');
      expect(callback).toHaveBeenCalledTimes(1);

      // Cleanup
      parent.removeEventListener(CONTEXT_REQUEST_EVENT, parentHandler);
      grandparent.removeEventListener(CONTEXT_REQUEST_EVENT, grandparentHandler);
      document.body.removeChild(grandparent);
    });

    test('provider can invoke callback multiple times for subscriptions', () => {
      const ctx = createContext<number>('counter');
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);
      document.body.appendChild(parent);

      let storedCallback: ContextCallback<number> | null = null;

      const handler = vi.fn((e: Event) => {
        const event = e as ContextRequestEvent<typeof ctx>;
        if (event.context === ctx) {
          event.stopImmediatePropagation();
          // Provide initial value
          event.callback(0, unsubscribe);
          // Store callback for future updates if subscribing
          if (event.subscribe) {
            storedCallback = event.callback;
          }
        }
      });

      parent.addEventListener(CONTEXT_REQUEST_EVENT, handler);

      const event = new ContextRequestEvent(ctx, child, callback, true);
      child.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(0, unsubscribe);

      // Simulate value update
      storedCallback!(1, unsubscribe);
      storedCallback!(2, unsubscribe);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenLastCalledWith(2, unsubscribe);

      // Cleanup
      parent.removeEventListener(CONTEXT_REQUEST_EVENT, handler);
      document.body.removeChild(parent);
    });

    test('context matching uses strict equality', () => {
      const ctx1 = createContext<string>('test');
      const ctx2 = createContext<string>('test'); // Same key, should match
      const ctx3 = createContext<string>('other');

      const callback = vi.fn();
      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const handler = vi.fn((e: Event) => {
        const event = e as ContextRequestEvent<UnknownContext>;
        // Only respond to ctx1 (or ctx2 since they're equal)
        if (event.context === ctx1) {
          event.stopImmediatePropagation();
          event.callback('matched');
        }
      });

      parent.addEventListener(CONTEXT_REQUEST_EVENT, handler);

      // Request with ctx2 (equal to ctx1)
      child.dispatchEvent(new ContextRequestEvent(ctx2, child, callback));
      expect(callback).toHaveBeenCalledWith('matched');

      callback.mockClear();

      // Request with ctx3 (different)
      child.dispatchEvent(new ContextRequestEvent(ctx3, child, callback));
      expect(callback).not.toHaveBeenCalled();

      // Cleanup
      parent.removeEventListener(CONTEXT_REQUEST_EVENT, handler);
      document.body.removeChild(parent);
    });
  });

  describe('Type utilities', () => {
    test('ContextType extracts value type', () => {
      const ctx = createContext<{ name: string }>('user');

      // This is a compile-time check - if it compiles, the types work
      type ExtractedType = ContextType<typeof ctx>;
      const value: ExtractedType = { name: 'test' };
      expect(value.name).toBe('test');
    });

    test('Context type carries both key and value type info', () => {
      const stringCtx = createContext<number>('key');
      const symbolCtx = createContext<string>(Symbol('key'));

      // These are compile-time checks
      expect(typeof stringCtx).toBe('string');
      expect(typeof symbolCtx).toBe('symbol');
    });
  });
});
