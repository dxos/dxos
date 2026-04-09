//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { MarkdownCapabilities } from '../types';
import { SetViewMode } from './definitions';

const handler: Operation.WithHandler<typeof SetViewMode> = SetViewMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, viewMode }) {
      yield* Capabilities.updateAtomValue(MarkdownCapabilities.State, (current) => ({
        ...current,
        viewMode: { ...current.viewMode, [id]: viewMode },
      }));
    }),
  ),
);

export default handler;
