//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';

import { Operation } from '@dxos/operation';

import { WnfsFile } from '../types';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, type, cid }) {
      return {
        object: WnfsFile.make({ name, type, cid }),
      };
    }),
  ),
);
