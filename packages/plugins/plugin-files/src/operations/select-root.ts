//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { SelectRoot } from './definitions';

import { FileCapabilities } from '../types';

const handler: Operation.WithHandler<typeof SelectRoot> = SelectRoot.pipe(
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

export default handler;
