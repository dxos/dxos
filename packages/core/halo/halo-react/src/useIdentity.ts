//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './HaloProvider';

/**
 * Returns the local identity, or `undefined` if none exists. Reactive: re-renders when the
 * identity is created or its profile changes. Replaces `@dxos/react-client`'s `useIdentity`.
 */
export const useIdentity = (): Identity.Info | undefined => {
  const services = useHaloServices();
  const atom = useMemo(
    () =>
      Atom.make(Identity.identity.pipe(Stream.provideContext(services), Stream.map(Option.getOrUndefined)), {
        // The stream emits the current identity, but only after its first (async) subscription
        // tick — until then the atom would sit at `Result.Initial` and callers would see "no
        // identity" for the first render(s) even when one already exists. Seed it with the
        // service's synchronous snapshot so the current identity is available on the very first
        // render; the stream's value takes over as soon as it arrives (and covers post-mount
        // create/update).
        initialValue: Option.getOrUndefined(Effect.runSync(Identity.getSnapshot.pipe(Effect.provide(services)))),
      }),
    [services],
  );
  return Result.getOrElse(useAtomValue(atom), () => undefined);
};
