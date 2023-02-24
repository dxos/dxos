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
  let updateStatus: Trigger<Status>;
  let reset: Trigger<boolean>;

  const changeStatus = (status: Status) => {
    currentStatus = status;
    statusUpdate.emit();
  };

  beforeEach(() => {
    config = new Config({ runtime: { client: { log: { filter: 'system-service:debug' } } } });
    statusUpdate = new Event<void>();
    currentStatus = Status.ACTIVE;
    updateStatus = new Trigger<Status>();
    reset = new Trigger<boolean>();

    systemService = new SystemServiceImpl({
      config,
      statusUpdate,
      getCurrentStatus: () => currentStatus,
      onUpdateStatus: (status) => {
        updateStatus.wake(status);
      },
      onReset: () => {
        reset.wake(true);
      }
    });
  });

  test('getConfig returns config', async () => {
    expect(await systemService.getConfig()).to.deep.equal(config.values);
  });

  test('updateStatus triggers callback', async () => {
    await systemService.updateStatus({ status: Status.INACTIVE });
    const result = await updateStatus.wait();
    expect(result).to.equal(Status.INACTIVE);
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
