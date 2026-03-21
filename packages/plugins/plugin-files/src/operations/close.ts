//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { Close } from './definitions';

import { FileCapabilities } from '../types';

export default Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
        ...current,
        files: current.files.filter((f) => f.id !== id),
      }));
    }),
  ),
);
