//
// Copyright 2023 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { EffectEx, Hook } from '@dxos/effect';
import { subscribeStream } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';

import { Closing, Reset, WipingStorage } from '../services/events.ts';
import { SystemServiceImpl } from './system-service.ts';

describe('SystemService', () => {
  let systemService: SystemServiceImpl;
  let config: Config;
  let statusRequested: Trigger<SystemStatus>;
  let steps: string[];

  beforeEach(() => {
    config = new Config({ runtime: { client: { log: { filter: 'system-service:debug' } } } });
    statusRequested = new Trigger<SystemStatus>();
    steps = [];

    const controller = Hook.makeController();
    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
    Effect.runSync(
      Effect.gen(function* () {
        yield* Hook.on(Closing, () => Effect.sync(() => void steps.push('close')));
        yield* Hook.on(WipingStorage, () => Effect.sync(() => void steps.push('wipe')));
        yield* Hook.on(Reset, () => Effect.sync(() => void steps.push('reset')));
      }).pipe(Effect.provideService(Hook.Controller, controller), Scope.provide(scope)),
    );
    systemService = new SystemServiceImpl({
      config: () => config,
      getDiagnostics: async () => ({}),
      controller,
    });
    systemService.setStatus(SystemStatus.ACTIVE);
    systemService.statusRequested.on((status) => {
      statusRequested.wake(status);
    });
  });

  test('getConfig returns config', async () => {
    expect(await EffectEx.runPromise(systemService['SystemService.getConfig']())).to.deep.equal(config.values);
  });

  test('updateStatus emits the requested status', async () => {
    await EffectEx.runPromise(systemService['SystemService.updateStatus']({ status: SystemStatus.INACTIVE }));
    const result = await statusRequested.wait();
    expect(result).to.equal(SystemStatus.INACTIVE);
  });

  test('queryStatus returns initial status', async () => {
    const response = await EffectEx.runPromise(
      systemService['SystemService.queryStatus']({}).pipe(Stream.runHead, Effect.map(Option.getOrThrow)),
    );
    expect(response).to.deep.equal({ status: SystemStatus.ACTIVE });
  });

  test('queryStatus streams status changes', async () => {
    const statuses: SystemStatus[] = [];
    const first = new Trigger();
    const done = new Trigger();
    const cleanup = subscribeStream(Context.empty(), systemService['SystemService.queryStatus']({}), {
      onData: ({ status }) => {
        statuses.push(status);
        first.wake();
        if (statuses.length === 3) {
          done.wake();
        }
      },
    });
    onTestFinished(cleanup);

    // Wait for the initial emission so the status subscription is active before mutating.
    await first.wait();
    systemService.setStatus(SystemStatus.INACTIVE);
    systemService.setStatus(SystemStatus.ACTIVE);
    await done.wait();
    expect(statuses).to.deep.equal([SystemStatus.ACTIVE, SystemStatus.INACTIVE, SystemStatus.ACTIVE]);
  });

  test('reset closes, wipes, reports inactive and notifies, in that order', async () => {
    await EffectEx.runPromise(systemService['SystemService.reset']());
    expect(steps).to.deep.equal(['close', 'wipe', 'reset']);
    expect(systemService.status).to.equal(SystemStatus.INACTIVE);
    // The status is final once a reset is under way.
    systemService.setStatus(SystemStatus.ACTIVE);
    expect(systemService.status).to.equal(SystemStatus.INACTIVE);
  });

  test('concurrent resets run the chain once', async () => {
    // The chain is detached, so without a single-flight gate a second caller would tear down and
    // wipe a stack the first one has already closed.
    await Promise.all([
      EffectEx.runPromise(systemService['SystemService.reset']()),
      EffectEx.runPromise(systemService['SystemService.reset']()),
      EffectEx.runPromise(systemService['SystemService.reset']()),
    ]);
    expect(steps).to.deep.equal(['close', 'wipe', 'reset']);
  });
});
