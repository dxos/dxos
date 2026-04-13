//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { FileCapabilities } from '../types';
import { handleToLocalDirectory } from '../util';
import { OpenDirectory } from './definitions';

const handler: Operation.WithHandler<typeof OpenDirectory> = OpenDirectory.pipe(
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

export default handler;
