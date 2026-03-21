//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { OpenDirectory } from './definitions';

import { FileCapabilities } from '../types';
import { handleToLocalDirectory } from '../util';

export default OpenDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const handle = yield* Effect.promise(async () => (window as any).showDirectoryPicker({ mode: 'readwrite' }));
      const directory = yield* Effect.promise(async () => handleToLocalDirectory(handle));
      yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
        ...current,
        files: [...current.files, directory],
      }));
      return { id: directory.id, subject: [directory.id] };
    }),
  ),
);
