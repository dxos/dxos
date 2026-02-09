//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';
import { expect, vi } from 'vitest';

import * as Observability from './observability';
import { type Extension, type ExtensionApi } from './observability-extension';

const createMockExtension = (overrides?: Partial<Extension> & { apis?: ExtensionApi[] }): Extension => ({
  initialize: vi.fn(() => Effect.succeed(undefined)),
  close: vi.fn(() => Effect.succeed(undefined)),
  enable: vi.fn(() => Effect.succeed(undefined)),
  disable: vi.fn(() => Effect.succeed(undefined)),
  flush: vi.fn(() => Effect.succeed(undefined)),
  identify: vi.fn(),
  alias: vi.fn(),
  setTags: vi.fn(),
  enabled: true,
  apis: [],
  ...overrides,
});

describe('Observability', () => {
  describe('lifecycle', () => {
    it.effect('initializes all extensions in order', () =>
      Effect.gen(function* () {
        const callOrder: number[] = [];
        const ext1 = createMockExtension({
          initialize: vi.fn(() => {
            callOrder.push(1);
            return Effect.succeed(undefined);
          }),
        });
        const ext2 = createMockExtension({
          initialize: vi.fn(() => {
            callOrder.push(2);
            return Effect.succeed(undefined);
          }),
        });

        yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        expect(callOrder).toEqual([1, 2]);
      }),
    );

    it.effect('calls close on all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();

        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        yield* obs.close();
        expect(ext1.close).toHaveBeenCalled();
        expect(ext2.close).toHaveBeenCalled();
      }),
    );

    it.effect('initialize is idempotent (second call is no-op)', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        yield* obs.initialize();
        expect(ext.initialize).toHaveBeenCalledTimes(1);
      }),
    );

    it.effect('initialize resets on error (can retry)', () =>
      Effect.gen(function* () {
        let callCount = 0;
        const ext = createMockExtension({
          initialize: vi.fn(() =>
            ++callCount === 1 ? Effect.fail(new Error('init failed')) : Effect.succeed(undefined),
          ),
        });

        const obs = yield* Function.pipe(Observability.make(), Observability.addExtension(Effect.succeed(ext)));
        // First init fails but is caught internally.
        yield* obs.initialize();
        // Can retry since _initialized was reset.
        yield* obs.initialize();
        expect(callCount).toBe(2);
      }),
    );

    it.effect('close clears subscriptions', () =>
      Effect.gen(function* () {
        const cleanup = vi.fn();
        const provider: Observability.DataProvider = () => Effect.succeed(cleanup);

        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addDataProvider(provider),
          Observability.initialize,
        );
        yield* obs.close();
        expect(cleanup).toHaveBeenCalled();
      }),
    );
  });

  describe('enable/disable', () => {
    it.effect('enable calls enable on all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        yield* obs.enable();
        expect(ext1.enable).toHaveBeenCalled();
        expect(ext2.enable).toHaveBeenCalled();
      }),
    );

    it.effect('disable calls disable on all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        yield* obs.disable();
        expect(ext1.disable).toHaveBeenCalled();
        expect(ext2.disable).toHaveBeenCalled();
      }),
    );
  });

  describe('flush', () => {
    it.effect('flush calls flush on all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        yield* obs.flush();
        expect(ext1.flush).toHaveBeenCalled();
        expect(ext2.flush).toHaveBeenCalled();
      }),
    );
  });

  describe('extensions', () => {
    it.effect('cannot add extension after initialization', () =>
      Effect.gen(function* () {
        const obs = yield* Function.pipe(Observability.make(), Observability.initialize);
        // addExtension calls the internal _addExtension which throws an invariant after init.
        // The invariant throw becomes a defect inside Effect.gen.
        const exit = yield* Function.pipe(
          Effect.succeed(obs),
          Observability.addExtension(Effect.succeed(createMockExtension())),
          Effect.exit,
        );
        expect(Exit.isFailure(exit)).toBe(true);
      }),
    );

    it.effect('enabled returns true when all extensions are enabled', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension({ enabled: true });
        const ext2 = createMockExtension({ enabled: true });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        expect(obs.enabled).toBe(true);
      }),
    );

    it.effect('enabled returns false when any extension is disabled', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension({ enabled: true });
        const ext2 = createMockExtension({ enabled: false });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        expect(obs.enabled).toBe(false);
      }),
    );
  });

  describe('identify/alias', () => {
    it.effect('identify forwards to all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        obs.identify('user-1', { name: 'Alice' }, { first_seen: 'today' });
        expect(ext1.identify).toHaveBeenCalledWith('user-1', { name: 'Alice' }, { first_seen: 'today' });
        expect(ext2.identify).toHaveBeenCalledWith('user-1', { name: 'Alice' }, { first_seen: 'today' });
      }),
    );

    it.effect('alias forwards to all extensions', () =>
      Effect.gen(function* () {
        const ext1 = createMockExtension();
        const ext2 = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext1)),
          Observability.addExtension(Effect.succeed(ext2)),
          Observability.initialize,
        );
        obs.alias('new-id', 'old-id');
        expect(ext1.alias).toHaveBeenCalledWith('new-id', 'old-id');
        expect(ext2.alias).toHaveBeenCalledWith('new-id', 'old-id');
      }),
    );
  });

  describe('setTags', () => {
    it.effect('forwards processed tags to all extensions', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        obs.setTags({ key: 'value' });
        expect(ext.setTags).toHaveBeenCalledWith({ key: 'value' });
      }),
    );

    it.effect('filters out undefined values', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        obs.setTags({ key: 'value', empty: undefined });
        expect(ext.setTags).toHaveBeenCalledWith({ key: 'value' });
      }),
    );

    it.effect('converts values to strings', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        obs.setTags({ count: 42, flag: true });
        expect(ext.setTags).toHaveBeenCalledWith({ count: '42', flag: 'true' });
      }),
    );

    it.effect('filters by kind when specified', () =>
      Effect.gen(function* () {
        const errorsExt = createMockExtension({
          apis: [{ kind: 'errors', captureException: vi.fn() }],
        });
        const eventsExt = createMockExtension({
          apis: [{ kind: 'events', captureEvent: vi.fn() }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(errorsExt)),
          Observability.addExtension(Effect.succeed(eventsExt)),
          Observability.initialize,
        );

        obs.setTags({ key: 'value' }, 'errors');
        expect(errorsExt.setTags).toHaveBeenCalledWith({ key: 'value' });
        // The eventsExt is skipped because its api kind ('events') !== 'errors'.
        expect(eventsExt.setTags).not.toHaveBeenCalled();
      }),
    );
  });

  describe('api delegation', () => {
    it.effect('errors.captureException delegates to error-kind extensions only', () =>
      Effect.gen(function* () {
        const captureException = vi.fn();
        const errorsExt = createMockExtension({
          apis: [{ kind: 'errors', captureException }],
        });
        const eventsExt = createMockExtension({
          apis: [{ kind: 'events', captureEvent: vi.fn() }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(errorsExt)),
          Observability.addExtension(Effect.succeed(eventsExt)),
          Observability.initialize,
        );
        const error = new Error('test');
        obs.errors.captureException(error, { context: 'test' });
        expect(captureException).toHaveBeenCalledWith(error, { context: 'test' });
      }),
    );

    it.effect('events.captureEvent delegates to events-kind extensions only', () =>
      Effect.gen(function* () {
        const captureEvent = vi.fn();
        const eventsExt = createMockExtension({
          apis: [{ kind: 'events', captureEvent }],
        });
        const errorsExt = createMockExtension({
          apis: [{ kind: 'errors', captureException: vi.fn() }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(eventsExt)),
          Observability.addExtension(Effect.succeed(errorsExt)),
          Observability.initialize,
        );
        obs.events.captureEvent('button_click', { page: 'home' });
        expect(captureEvent).toHaveBeenCalledWith('button_click', { page: 'home' });
      }),
    );

    it.effect('feedback.captureUserFeedback delegates to feedback-kind extensions only', () =>
      Effect.gen(function* () {
        const captureUserFeedback = vi.fn();
        const feedbackExt = createMockExtension({
          apis: [{ kind: 'feedback', captureUserFeedback }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(feedbackExt)),
          Observability.initialize,
        );
        obs.feedback.captureUserFeedback({ message: 'great app' });
        expect(captureUserFeedback).toHaveBeenCalledWith({ message: 'great app' });
      }),
    );

    it.effect('metrics delegates to metrics-kind extensions only', () =>
      Effect.gen(function* () {
        const gauge = vi.fn();
        const increment = vi.fn();
        const distribution = vi.fn();
        const metricsExt = createMockExtension({
          apis: [{ kind: 'metrics', gauge, increment, distribution }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(metricsExt)),
          Observability.initialize,
        );
        obs.metrics.gauge('cpu', 0.5, { host: 'a' });
        obs.metrics.increment('requests', 1, { route: '/api' });
        obs.metrics.distribution('latency', 120, { endpoint: '/api' });
        expect(gauge).toHaveBeenCalledWith('cpu', 0.5, { host: 'a' });
        expect(increment).toHaveBeenCalledWith('requests', 1, { route: '/api' });
        expect(distribution).toHaveBeenCalledWith('latency', 120, { endpoint: '/api' });
      }),
    );

    it.effect('ignores extensions that do not provide the requested kind', () =>
      Effect.gen(function* () {
        const captureException = vi.fn();
        const ext = createMockExtension({
          apis: [{ kind: 'errors', captureException }],
        });
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        // Call events — errors extension should not be invoked.
        obs.events.captureEvent('test', {});
        expect(captureException).not.toHaveBeenCalled();
      }),
    );
  });

  describe('data providers', () => {
    it.effect('providers registered before init run during initialization', () =>
      Effect.gen(function* () {
        const providerFn = vi.fn();
        const provider: Observability.DataProvider = (obs) => {
          providerFn(obs);
          return Effect.succeed(undefined);
        };

        yield* Function.pipe(Observability.make(), Observability.addDataProvider(provider), Observability.initialize);
        expect(providerFn).toHaveBeenCalledTimes(1);
      }),
    );

    it.effect('addDataProvider (post-init) immediately runs provider', () =>
      Effect.gen(function* () {
        const cleanup = vi.fn();
        const provider: Observability.DataProvider = () => Effect.succeed(cleanup);

        const obs = yield* Function.pipe(Observability.make(), Observability.initialize);
        yield* obs.addDataProvider(provider);
        // Provider runs immediately; cleanup registered.
        yield* obs.close();
        expect(cleanup).toHaveBeenCalled();
      }),
    );

    it.effect('provider cleanup functions are called on close', () =>
      Effect.gen(function* () {
        const cleanup1 = vi.fn();
        const cleanup2 = vi.fn();
        const provider1: Observability.DataProvider = () => Effect.succeed(cleanup1);
        const provider2: Observability.DataProvider = () => Effect.succeed(cleanup2);

        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addDataProvider(provider1),
          Observability.addDataProvider(provider2),
          Observability.initialize,
        );
        yield* obs.close();
        expect(cleanup1).toHaveBeenCalled();
        expect(cleanup2).toHaveBeenCalled();
      }),
    );

    it.effect('provider errors do not crash initialization', () =>
      Effect.gen(function* () {
        const failingProvider: Observability.DataProvider = () => Effect.fail(new Error('provider failed'));
        const obs = yield* Function.pipe(Observability.make(), Observability.addDataProvider(failingProvider));
        // Should not throw — error is caught internally.
        yield* obs.initialize();
      }),
    );
  });

  describe('composition helpers', () => {
    it.effect('make() creates a new Observability instance', () =>
      Effect.gen(function* () {
        const obs = yield* Observability.make();
        expect(obs).toBeDefined();
        expect(typeof obs.initialize).toBe('function');
        expect(typeof obs.close).toBe('function');
        expect(typeof obs.enable).toBe('function');
        expect(typeof obs.disable).toBe('function');
      }),
    );

    it.effect('addExtension pipes an extension into the instance', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(Observability.make(), Observability.addExtension(Effect.succeed(ext)));
        yield* obs.initialize();
        expect(ext.initialize).toHaveBeenCalled();
      }),
    );

    it.effect('addDataProvider pipes a provider into the instance', () =>
      Effect.gen(function* () {
        const providerFn = vi.fn(() => Effect.succeed(undefined));
        const provider: Observability.DataProvider = () => providerFn();

        const obs = yield* Function.pipe(Observability.make(), Observability.addDataProvider(provider));
        yield* obs.initialize();
        expect(providerFn).toHaveBeenCalled();
      }),
    );

    it.effect('initialize triggers initialization', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.initialize,
        );
        expect(ext.initialize).toHaveBeenCalled();
        expect(obs).toBeDefined();
      }),
    );

    it.effect('full pipeline: make -> addExtension -> addDataProvider -> initialize', () =>
      Effect.gen(function* () {
        const ext = createMockExtension();
        const providerFn = vi.fn(() => Effect.succeed(undefined));
        const provider: Observability.DataProvider = () => providerFn();

        const obs = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(ext)),
          Observability.addDataProvider(provider),
          Observability.initialize,
        );

        expect(ext.initialize).toHaveBeenCalled();
        expect(providerFn).toHaveBeenCalled();
        expect(obs.enabled).toBe(true);
      }),
    );
  });
});
