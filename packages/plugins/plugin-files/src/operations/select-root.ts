//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { SelectRoot } from './definitions';

import { FileCapabilities } from '../types';

export default SelectRoot.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const rootDir = yield* Effect.promise(async () => (window as any).showDirectoryPicker({ mode: 'readwrite' }));
      if (rootDir) {
        yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
          ...current,
          rootHandle: rootDir,
        }));
      }
    }),
  ),
);
