//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './useHaloServices';
import { useReactive } from './useReactive';

/**
 * Returns the local identity, or `undefined` if none exists. Reactive: re-renders when the
 * identity is created or its profile changes. Replaces `@dxos/react-client`'s `useIdentity`.
 */
export const useIdentity = (): Identity.Info | undefined => {
  const service = Context.get(useHaloServices(), Identity.Service);
  return useReactive(
    Effect.map(service.current, Option.getOrUndefined),
    Stream.map(service.changes, Option.getOrUndefined),
    [service],
  );
};
