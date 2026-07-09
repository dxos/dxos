//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';
import * as Stream from 'effect/Stream';
import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Event, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { subscribeStream } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';

import { SystemServiceImpl } from './system-service';

describe('SystemService', () => {
  let systemService: SystemServiceImpl;
  let config: Config;
  let statusUpdate: Event<void>;
  let currentStatus: SystemStatus;
  let updateStatus: Trigger<SystemStatus>;
  let reset: Trigger<boolean>;

  const changeStatus = (status: SystemStatus) => {
    currentStatus = status;
    statusUpdate.emit();
  };

  beforeEach(() => {
    config = new Config({ runtime: { client: { log: { filter: 'system-service:debug' } } } });
    statusUpdate = new Event<void>();
    currentStatus = SystemStatus.ACTIVE;
    updateStatus = new Trigger<SystemStatus>();
    reset = new Trigger<boolean>();

    systemService = new SystemServiceImpl({
      config: () => config,
      statusUpdate,
      getCurrentStatus: () => currentStatus,
      getDiagnostics: async () => ({}),
      onUpdateStatus: (status) => {
        updateStatus.wake(status);
      },
      onReset: () => {
        reset.wake(true);
      },
    });
  });

  test('getConfig returns config', async () => {
    expect(await EffectEx.runPromise(systemService['SystemService.getConfig']())).to.deep.equal(config.values);
  });

  test('updateStatus triggers callback', async () => {
    await EffectEx.runPromise(systemService['SystemService.updateStatus']({ status: SystemStatus.INACTIVE }));
    const result = await updateStatus.wait();
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
    const cleanup = subscribeStream(Runtime.defaultRuntime, systemService['SystemService.queryStatus']({}), {
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
    changeStatus(SystemStatus.INACTIVE);
    changeStatus(SystemStatus.ACTIVE);
    await done.wait();
    expect(statuses).to.deep.equal([SystemStatus.ACTIVE, SystemStatus.INACTIVE, SystemStatus.ACTIVE]);
  });

  test('reset triggers callback', async () => {
    await EffectEx.runPromise(systemService['SystemService.reset']());
    const result = await reset.wait();
    expect(result).to.be.true;
  });
});
