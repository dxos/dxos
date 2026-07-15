//
// Copyright 2026 DXOS.org
//

import { Result, useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloRuntime } from './HaloProvider';

/**
 * Returns the local identity, or `undefined` if none exists. Reactive: re-renders when the
 * identity is created or its profile changes. Replaces `@dxos/react-client`'s `useIdentity`.
 */
export const useIdentity = (): Identity.Info | undefined => {
  const runtime = useHaloRuntime();
  const atom = useMemo(() => runtime.atom(Stream.map(Identity.identity, Option.getOrUndefined)), [runtime]);
  return Result.getOrElse(useAtomValue(atom), () => undefined);
};
