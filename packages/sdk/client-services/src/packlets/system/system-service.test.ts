//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Event, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { Status, StatusResponse, SystemService } from '@dxos/protocols/proto/dxos/client/services';
import { beforeEach, describe, test } from '@dxos/test';

import { SystemServiceImpl } from './system-service';

describe('SystemService', () => {
  let systemService: SystemService;
  let config: Config;
  let statusUpdate: Event<void>;
  let currentStatus: Status;
  let createSession: Trigger<boolean>;
  let reset: Trigger<boolean>;

  const changeStatus = (status: Status) => {
    currentStatus = status;
    statusUpdate.emit();
  };

  beforeEach(() => {
    config = new Config({ runtime: { client: { log: { filter: 'system-service:debug' } } } });
    statusUpdate = new Event<void>();
    currentStatus = Status.ACTIVE;
    createSession = new Trigger<boolean>();
    reset = new Trigger<boolean>();

    systemService = new SystemServiceImpl({
      config,
      statusUpdate,
      onCreateSession: () => {
        createSession.wake(true);
      },
      onStatusUpdate: () => currentStatus,
      onReset: () => {
        reset.wake(true);
      }
    });
  });

  test('getConfig returns config', async () => {
    expect(await systemService.getConfig()).to.deep.equal(config.values);
  });

  test('createSession triggers callback', async () => {
    await systemService.createSession();
    const result = await createSession.wait();
    expect(result).to.be.true;
  });

  test('queryStatus returns initial status', async () => {
    const status = new Trigger<StatusResponse>();
    systemService.queryStatus().subscribe((response) => {
      status.wake(response);
    });
    expect(await status.wait()).to.deep.equal({ status: Status.ACTIVE });
  });

  test('queryStatus streams status changes', async () => {
    const statuses: Status[] = [];
    systemService.queryStatus().subscribe(({ status }) => {
      statuses.push(status);
    });
    changeStatus(Status.INACTIVE);
    changeStatus(Status.ACTIVE);
    expect(statuses).to.deep.equal([Status.ACTIVE, Status.INACTIVE, Status.ACTIVE]);
  });

  test('reset triggers callback', async () => {
    await systemService.reset();
    const result = await reset.wait();
    expect(result).to.be.true;
  });
});
