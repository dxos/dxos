//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import * as Process from '@dxos/compute/Process';
import { Annotation } from '@dxos/echo';

export const makeProcess = (
  overrides: Partial<Process.Process> & Pick<Process.Process, 'pid' | 'state'> & { name: string },
): Process.Process => ({
  parentPid: null,
  key: `test.process.${overrides.name}`,
  params: { name: overrides.name, annotations: Annotation.buildDictionary(() => {}) },
  environment: {},
  error: null,
  startedAt: Date.now() - 10_000,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  ...overrides,
});
