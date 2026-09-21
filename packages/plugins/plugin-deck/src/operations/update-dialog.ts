//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDialog> = LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const open = input.state ?? Boolean(input.subject);
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        dialogOpen: open,
        dialog: open
          ? {
              type: input.type ?? 'default',
              blockAlign: input.blockAlign ?? 'center',
              overlayClasses: input.overlayClasses,
              overlayStyle: input.overlayStyle,
              content: input.subject ? { component: input.subject, props: input.props } : undefined,
            }
          : null,
      }));
    }),
  ),
);

export default handler;
