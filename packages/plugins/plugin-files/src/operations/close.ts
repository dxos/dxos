//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { FileCapabilities } from '../types';
import { FilesOperation } from '../types';

const handler: Operation.WithHandler<typeof FilesOperation.Close> = FilesOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
        ...current,
        files: current.files.filter((f) => f.id !== id),
      }));
    }),
  ),
);

export default handler;
