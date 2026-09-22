//
// Copyright 2025 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { dialogExitDuration } from '@dxos/ui-theme';

import { DeckCapabilities, DeckSchema } from '#types';

const FRAME = 16;

/** A few frames past the exit, so the clear lands after the last frame it paints rather than in it. */
const CLEAR_AFTER = Duration.millis(dialogExitDuration + 3 * FRAME);

const CLOSED_DIALOG = {
  dialogType: undefined,
  dialogBlockAlign: undefined,
  dialogOverlayClasses: undefined,
  dialogOverlayStyle: undefined,
  dialogContent: null,
} satisfies Partial<DeckSchema.EphemeralDeckState>;

/** Drop what the dialog was showing, unless another has opened and made the state its own. */
const clearWhenExited = Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) =>
  state.dialogOpen ? state : { ...state, ...CLOSED_DIALOG },
).pipe(Effect.delay(CLEAR_AFTER));

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDialog> = LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.state ?? Boolean(input.subject)) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
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
        }));
        return;
      }

      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        dialogOpen: false,
      }));
      yield* Effect.forkDetach(clearWhenExited);
    }),
  ),
);

export default handler;
