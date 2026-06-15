//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.SetViewMode> = MarkdownOperation.SetViewMode.pipe(
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
