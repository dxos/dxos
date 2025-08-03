//
// Copyright 2023 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { type QueryStatusResponse, type SystemService, SystemStatus } from '@dxos/protocols/proto/dxos/client/services';

import { SystemServiceImpl } from './system-service';

describe('SystemService', () => {
  let systemService: SystemService;
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
    expect(await systemService.getConfig()).to.deep.equal(config.values);
  });

  test('updateStatus triggers callback', async () => {
    await systemService.updateStatus({ status: SystemStatus.INACTIVE });
    const result = await updateStatus.wait();
    expect(result).to.equal(SystemStatus.INACTIVE);
  });

  test('queryStatus returns initial status', async () => {
    const status = new Trigger<QueryStatusResponse>();
    systemService.queryStatus({}).subscribe((response) => {
      status.wake(response);
    });
    expect(await status.wait()).to.deep.equal({ status: SystemStatus.ACTIVE });
  });

  test('queryStatus streams status changes', async () => {
    const statuses: SystemStatus[] = [];
    systemService.queryStatus({}).subscribe(({ status }) => {
      statuses.push(status);
    });
    changeStatus(SystemStatus.INACTIVE);
    changeStatus(SystemStatus.ACTIVE);
    expect(statuses).to.deep.equal([SystemStatus.ACTIVE, SystemStatus.INACTIVE, SystemStatus.ACTIVE]);
  });

  test('reset triggers callback', async () => {
    await systemService.reset();
    const result = await reset.wait();
    expect(result).to.be.true;
  });
});
