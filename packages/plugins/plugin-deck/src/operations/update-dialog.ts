//
// Copyright 2025 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

/** `--animate-fade-out` and `--animate-slide-down-and-fade` in `theme/animation.css`. */
const EXIT_ANIMATION = Duration.millis(400);

/** A few frames past the exit, so the clear lands after the last frame it paints rather than in it. */
const CLEAR_AFTER = Duration.sum(EXIT_ANIMATION, Duration.millis(50));

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

      // Closing is two writes, not one: the dialog is on screen for the whole exit, so what it shows
      // has to outlive the flag that starts it leaving.
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        dialogOpen: false,
      }));
      yield* Effect.forkDetach(
        Effect.sleep(CLEAR_AFTER).pipe(
          Effect.andThen(
            Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) =>
              // A dialog opened while the last one was still leaving owns the state now.
              state.dialogOpen
                ? state
                : {
                    ...state,
                    dialogType: undefined,
                    dialogBlockAlign: undefined,
                    dialogOverlayClasses: undefined,
                    dialogOverlayStyle: undefined,
                    dialogContent: null,
                  },
            ),
          ),
        ),
      );
    }),
  ),
);

export default handler;
