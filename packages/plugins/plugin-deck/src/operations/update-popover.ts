//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdatePopover> = LayoutOperation.UpdatePopover.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        popoverOpen: input.state ?? Boolean(input.subject),
        popoverKind: input.kind ?? 'base',
        popoverTitle: input.kind === 'card' ? input.title : undefined,
        popoverContentRef: input.subjectRef,
        popoverContent:
          typeof input.subject === 'string'
            ? { component: input.subject, props: input.props }
            : input.subject
              ? { subject: input.subject }
              : null,
        popoverSide: input.side,
        popoverAnchor: input.variant === 'virtual' ? input.anchor : state.popoverAnchor,
        popoverAnchorId: input.variant !== 'virtual' ? input.anchorId : state.popoverAnchorId,
      }));
    }),
  ),
);

export default handler;
