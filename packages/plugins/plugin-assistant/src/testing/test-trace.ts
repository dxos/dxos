//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { Process } from '@dxos/functions';

export const makeProcess = (
  overrides: Partial<Process.Info> & Pick<Process.Info, 'pid' | 'state'> & { name: string },
): Process.Info => ({
  parentPid: null,
  key: `test.process.${overrides.name}`,
  params: { name: overrides.name, target: null },
  error: null,
  startedAt: Date.now() - 10_000,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  ...overrides,
});
