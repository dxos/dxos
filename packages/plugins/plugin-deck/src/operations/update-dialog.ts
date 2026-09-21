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
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) =>
        // Closing touches nothing but the flag, so the overlay exits showing what it had; the next
        // open replaces all of it.
        open
          ? {
              ...state,
              dialogOpen: true,
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
            }
          : { ...state, dialogOpen: false },
      );
    }),
  ),
);

export default handler;
