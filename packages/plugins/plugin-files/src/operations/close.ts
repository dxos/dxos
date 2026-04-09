//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { FileCapabilities } from '../types';
import { Close } from './definitions';

const handler: Operation.WithHandler<typeof Close> = Close.pipe(
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
