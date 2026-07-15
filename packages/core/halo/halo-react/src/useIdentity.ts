//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
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
    () => Atom.make(Identity.identity.pipe(Stream.provideContext(services), Stream.map(Option.getOrUndefined))),
    [services],
  );
  return Result.getOrElse(useAtomValue(atom), () => undefined);
};
