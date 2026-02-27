//
// Copyright 2023 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
  Runtime_Client_LogSchema,
} from '@dxos/protocols/buf/dxos/config_pb';
import {
  type QueryStatusResponse,
  QueryStatusRequestSchema,
  SystemStatus,
  UpdateStatusRequestSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';

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
    config = new Config(
      create(ConfigSchema, {
        runtime: create(RuntimeSchema, {
          client: create(Runtime_ClientSchema, {
            log: create(Runtime_Client_LogSchema, { filter: 'system-service:debug' }),
          }),
        }),
      }),
    );
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

  test('getConfig returns config', async ({ expect }) => {
    const result = await systemService.getConfig();
    expect(result.runtime?.client?.log?.filter).to.equal('system-service:debug');
  });

  test('updateStatus triggers callback', async ({ expect }) => {
    await systemService.updateStatus(create(UpdateStatusRequestSchema, { status: SystemStatus.INACTIVE }));
    const result = await updateStatus.wait();
    expect(result).to.equal(SystemStatus.INACTIVE);
  });

  test('queryStatus returns initial status', async ({ expect }) => {
    const status = new Trigger<QueryStatusResponse>();
    systemService.queryStatus(create(QueryStatusRequestSchema)).subscribe((response) => {
      status.wake(response);
    });
    const response = await status.wait();
    expect(response.status).to.equal(SystemStatus.ACTIVE);
  });

  test('queryStatus streams status changes', async ({ expect }) => {
    const statuses: SystemStatus[] = [];
    systemService.queryStatus(create(QueryStatusRequestSchema)).subscribe(({ status }) => {
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
