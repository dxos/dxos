//
// Copyright 2023 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';

import { waitForCondition } from '@dxos/async';

import { WATCHDOG_CHECK_INTERVAL, WATCHDOG_START_TIMEOUT, WATCHDOG_STOP_TIMEOUT } from './defs';

export const waitForPidCreation = async (pidFile: string) =>
  waitForCondition({
    condition: () => existsSync(pidFile),
    timeout: WATCHDOG_START_TIMEOUT,
    interval: WATCHDOG_CHECK_INTERVAL,
  });

export const waitForPidDeletion = async (pidFile: string) =>
  waitForCondition({
    condition: () => !existsSync(pidFile),
    timeout: WATCHDOG_STOP_TIMEOUT,
    interval: WATCHDOG_CHECK_INTERVAL,
  });

export const waitForPidFileBeingFilledWithInfo = async (pidFile: string) =>
  waitForCondition({
    condition: () => readFileSync(pidFile, { encoding: 'utf-8' }).includes('pid'),
    timeout: WATCHDOG_START_TIMEOUT,
    interval: WATCHDOG_CHECK_INTERVAL,
    error: new Error('Lock file is not being propagated with info.'),
  });
