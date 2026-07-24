//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Attention } from '@dxos/react-ui-attention';

import { CommentCapabilities } from '../types';
import { CommentOperation } from '../types';

const handler: Operation.WithHandler<typeof CommentOperation.Select> = CommentOperation.Select.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(CommentCapabilities.State);
      const current = registry.get(stateAtom);
      registry.set(stateAtom, { ...current, current: input.current });

      // A deliberate click reveals the thread in the comments companion (open + switch to it). Nested
      // here — running in an operation context — so it opens reliably (see the `reveal` note on Select).
      if (input.reveal) {
        yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
          subject: Attention.linkedSegment('comments'),
        });
      }
    }),
  ),
);

export default handler;
