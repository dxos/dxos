//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { SetViewMode } from './definitions';

import { MarkdownCapabilities } from '../types';

export default SetViewMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, viewMode }) {
      yield* Capabilities.updateAtomValue(MarkdownCapabilities.State, (current) => ({
        ...current,
        viewMode: { ...current.viewMode, [id]: viewMode },
      }));
    }),
  ),
);
