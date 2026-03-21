//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { Save } from './definitions';

import { FileCapabilities } from '../types';
import { findFile, handleSave } from '../util';

export default Save.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const state = yield* Capabilities.getAtomValue(FileCapabilities.State);
      const file = findFile(state.files, [id]);
      if (file) {
        yield* Effect.promise(async () => handleSave(file));
      }
    }),
  ),
);
