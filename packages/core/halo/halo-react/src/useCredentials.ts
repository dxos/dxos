//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './HaloProvider';

const EMPTY: readonly Identity.Credential[] = [];

/**
 * Returns the local identity's HALO credentials. Reactive: re-renders when credentials are
 * written. Replaces `@dxos/react-client`'s `useCredentials`.
 */
export const useCredentials = (): readonly Identity.Credential[] => {
  const services = useHaloServices();
  const atom = useMemo(() => Atom.make(Identity.credentials.pipe(Stream.provideContext(services))), [services]);
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
