//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as Result from 'effect/unstable/reactivity/AsyncResult';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { type Invitation } from '@dxos/halo';

/**
 * The observable state of one invitation flow: its latest lifecycle event and its shareable code.
 * `event` is `undefined` until the flow emits, which is also how a caller distinguishes "not
 * started" from `connecting`.
 */
export type InvitationFlowState = {
  readonly event: Invitation.Event | undefined;
  readonly code: string | undefined;
};

const INITIAL: InvitationFlowState = { event: undefined, code: undefined };

/**
 * Tracks one {@link Invitation.Flow} for rendering, re-rendering on each lifecycle event. Needs no
 * `HaloProvider`: a flow's streams and effects carry no service requirement.
 */
export const useInvitationFlow = (flow?: Invitation.Flow): InvitationFlowState => {
  const atom = useMemo(
    () =>
      flow
        ? Atom.make(
            // The code is resolved once and re-emitted with each event: it is stable for the flow's
            // lifetime, and pairing the two keeps the rendered QR and state from tearing.
            Stream.zipLatest(flow.events, Stream.fromEffect(flow.code)).pipe(
              Stream.map(([event, code]): InvitationFlowState => ({ event, code })),
            ),
          )
        : Atom.make(Effect.succeed(INITIAL)),
    [flow],
  );
  return Result.getOrElse(useAtomValue(atom), () => INITIAL);
};
