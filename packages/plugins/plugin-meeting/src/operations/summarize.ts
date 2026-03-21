// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { Summarize } from './definitions';

export default Summarize.pipe(
  Operation.withHandler(
    () => Effect.fail(new Error('Not implemented')),
  ),
);
