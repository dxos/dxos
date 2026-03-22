//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDialog> = LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        dialogOpen: input.state ?? Boolean(input.subject),
        dialogType: input.type ?? 'default',
        dialogBlockAlign: input.blockAlign ?? 'center',
        dialogOverlayClasses: input.overlayClasses,
        dialogOverlayStyle: input.overlayStyle,
        dialogContent: input.subject
          ? {
              component: input.subject,
              props: input.props,
            }
          : null,
      }));
    }),
  ),
);

export default handler;
