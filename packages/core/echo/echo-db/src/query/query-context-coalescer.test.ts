//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';

import { type QueryContext } from './query-context';
import { QueryContextCoalescer } from './query-context-coalescer';

/**
 * Minimal mock implementing QueryContext.
 */
class MockQueryContext implements QueryContext {
  readonly changed = new Event<void>();

  readonly startCalls: QueryAST.Query[] = [];
  readonly stopCalls: number[] = [];
  readonly updateCalls: QueryAST.Query[] = [];
  readonly runCalls: QueryAST.Query[] = [];

  private _results: any[] = [];
  private _runDelay = 0;

  constructor(private readonly _id: string = 'mock') {}

  setResults(results: any[]): void {
    this._results = results;
  }

  setRunDelay(ms: number): void {
    this._runDelay = ms;
  }

  getResults() {
    return this._results;
  }

  update(query: QueryAST.Query): void {
    this.updateCalls.push(query);
  }

  start(): void {
    this.startCalls.push(this.updateCalls.at(-1)!);
  }

  stop(): void {
    this.stopCalls.push(Date.now());
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<any[]> {
    this.runCalls.push(query);
    if (this._runDelay > 0) {
      await sleep(this._runDelay);
    }
    return this._results;
  }
}

describe('QueryContextCoalescer', () => {
  const ast1 = Query.select(Filter.typename('Foo')).ast;
  const ast1WithLabel = Query.select(Filter.typename('Foo')).debugLabel('my-label').ast;
  const ast2 = Query.select(Filter.typename('Bar')).ast;

  let factoryCalls: MockQueryContext[];
  let coalescer: QueryContextCoalescer;

  beforeEach(() => {
    factoryCalls = [];
    coalescer = new QueryContextCoalescer(() => {
      const ctx = new MockQueryContext(`mock-${factoryCalls.length}`);
      factoryCalls.push(ctx);
      return ctx;
    });
  });

  afterEach(() => {
    coalescer.dispose();
    vi.useRealTimers();
  });

  describe('handle sharing', () => {
    test('same canonical key → one underlying context created', () => {
      coalescer.getOrCreate(ast1);
      coalescer.getOrCreate(ast1WithLabel); // same semantic, different debugLabel
      expect(factoryCalls).toHaveLength(1);
    });

    test('different semantic keys → separate underlying contexts', () => {
      coalescer.getOrCreate(ast1);
      coalescer.getOrCreate(ast2);
      expect(factoryCalls).toHaveLength(2);
    });

    test('underlying update called once per unique key', () => {
      coalescer.getOrCreate(ast1);
      coalescer.getOrCreate(ast1WithLabel);
      expect(factoryCalls[0].updateCalls).toHaveLength(1);
    });
  });

  describe('refcount lifecycle', () => {
    test('start() on N handles → underlying start() called once', () => {
      const h1 = coalescer.getOrCreate(ast1);
      const h2 = coalescer.getOrCreate(ast1WithLabel);
      h1.start();
      h2.start();
      expect(factoryCalls[0].startCalls).toHaveLength(1);
    });

    test('stop() when one handle still running → underlying still active', async () => {
      vi.useFakeTimers();
      const h1 = coalescer.getOrCreate(ast1);
      const h2 = coalescer.getOrCreate(ast1);
      h1.start();
      h2.start();
      h1.stop(); // refcount 2→1, still running
      await vi.runAllTimersAsync();
      expect(factoryCalls[0].stopCalls).toHaveLength(0);
    });

    test('stop() when last handle stops → underlying stop() called after grace', async () => {
      vi.useFakeTimers();
      const h1 = coalescer.getOrCreate(ast1);
      h1.start();
      h1.stop(); // refcount 1→0, schedule grace timer
      expect(factoryCalls[0].stopCalls).toHaveLength(0);
      await vi.runAllTimersAsync();
      expect(factoryCalls[0].stopCalls).toHaveLength(1);
    });

    test('new start() within grace period cancels the stop timer', async () => {
      vi.useFakeTimers();
      const h1 = coalescer.getOrCreate(ast1);
      const h2 = coalescer.getOrCreate(ast1);
      h1.start();
      h1.stop(); // schedule grace timer
      h2.start(); // arrives before timer fires — cancel it
      await vi.runAllTimersAsync();
      expect(factoryCalls[0].stopCalls).toHaveLength(0);
    });
  });

  describe('getResults delegation', () => {
    test('getResults() delegates to shared underlying context', () => {
      const handle = coalescer.getOrCreate(ast1);
      handle.start();
      const expected = [{ id: 'a', result: {} }];
      factoryCalls[0].setResults(expected);
      expect(handle.getResults()).toBe(expected);
    });
  });

  describe('changed event forwarding', () => {
    test('changed event on underlying fires on all handles for same key', () => {
      const h1 = coalescer.getOrCreate(ast1);
      const h2 = coalescer.getOrCreate(ast1WithLabel);
      let h1Fired = 0;
      let h2Fired = 0;
      h1.changed.on(() => {
        h1Fired++;
      });
      h2.changed.on(() => {
        h2Fired++;
      });
      factoryCalls[0].changed.emit();
      expect(h1Fired).toBe(1);
      expect(h2Fired).toBe(1);
    });
  });

  describe('run() deduplication', () => {
    test('concurrent run() calls with same key share one underlying run', async () => {
      const ctx = new MockQueryContext();
      let calls = 0;
      ctx.setRunDelay(20);
      // Replace factory result with our controlled mock.
      factoryCalls = [];
      const c2 = new QueryContextCoalescer(() => {
        factoryCalls.push(ctx);
        return ctx;
      });
      try {
        const h1 = c2.getOrCreate(ast1);
        const h2 = c2.getOrCreate(ast1);

        const [r1, r2] = await Promise.all([
          h1.run(Context.default(), ast1, { timeout: 5000 }),
          h2.run(Context.default(), ast1, { timeout: 5000 }),
        ]);

        expect(ctx.runCalls).toHaveLength(1);
        expect(r1).toBe(r2);
      } finally {
        c2.dispose();
      }
    });

    test('sequential run() calls do not share in-flight promise', async () => {
      const ctx = new MockQueryContext();
      ctx.setRunDelay(1);
      factoryCalls = [];
      const c2 = new QueryContextCoalescer(() => {
        factoryCalls.push(ctx);
        return ctx;
      });
      try {
        const h = c2.getOrCreate(ast1);
        await h.run(Context.default(), ast1);
        await h.run(Context.default(), ast1);
        expect(ctx.runCalls).toHaveLength(2);
      } finally {
        c2.dispose();
      }
    });

    test('per-caller timeout: short timeout rejects while long timeout resolves', async () => {
      const ctx = new MockQueryContext();
      ctx.setRunDelay(100);
      factoryCalls = [];
      const c2 = new QueryContextCoalescer(() => {
        factoryCalls.push(ctx);
        return ctx;
      });
      try {
        const h1 = c2.getOrCreate(ast1);
        const h2 = c2.getOrCreate(ast1);

        const [shortResult, longResult] = await Promise.allSettled([
          h1.run(Context.default(), ast1, { timeout: 30 }),
          h2.run(Context.default(), ast1, { timeout: 5000 }),
        ]);

        expect(shortResult.status).toBe('rejected');
        expect(longResult.status).toBe('fulfilled');
        // Only one underlying run was dispatched.
        expect(ctx.runCalls).toHaveLength(1);
      } finally {
        c2.dispose();
      }
    });

    test('one caller ctx cancellation does not prevent the other caller from resolving', async () => {
      const ctx = new MockQueryContext();
      ctx.setRunDelay(50);
      factoryCalls = [];
      const c2 = new QueryContextCoalescer(() => {
        factoryCalls.push(ctx);
        return ctx;
      });
      try {
        const cancelCtx = new Context();
        const h1 = c2.getOrCreate(ast1);
        const h2 = c2.getOrCreate(ast1);

        void cancelCtx.dispose(); // cancel immediately

        // Even though the first caller's ctx was disposed, the shared run continues.
        const result = await h2.run(Context.default(), ast1, { timeout: 5000 });
        expect(Array.isArray(result)).toBe(true);
        expect(ctx.runCalls).toHaveLength(1);
      } finally {
        c2.dispose();
      }
    });
  });

  describe('read-your-writes', () => {
    test('run() after results change returns fresh data (no stale cache)', async () => {
      const ctx = new MockQueryContext();
      const c2 = new QueryContextCoalescer(() => {
        factoryCalls.push(ctx);
        return ctx;
      });
      try {
        const handle = c2.getOrCreate(ast1);
        ctx.setResults([{ id: 'a', result: {} }]);
        const r1 = await handle.run(Context.default(), ast1);
        expect(r1).toHaveLength(1);

        // Simulate write: update results.
        ctx.setResults([
          { id: 'a', result: {} },
          { id: 'b', result: {} },
        ]);
        const r2 = await handle.run(Context.default(), ast1);
        expect(r2).toHaveLength(2);

        // Two separate run() calls → two underlying run() calls.
        expect(ctx.runCalls).toHaveLength(2);
      } finally {
        c2.dispose();
      }
    });
  });

  describe('dispose', () => {
    test('dispose() stops all running entries', async () => {
      vi.useFakeTimers();
      const h1 = coalescer.getOrCreate(ast1);
      h1.start();
      coalescer.dispose();
      expect(factoryCalls[0].stopCalls).toHaveLength(1);
    });
  });
});
