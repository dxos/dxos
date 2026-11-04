//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type AwarenessProviderOptions, createAwarenessProvider } from '@dxos/ui-editor';

/**
 * The awareness channel for the object a grid shows, which `Grid.Root` opens while mounted. It is the channel and
 * identity a Markdown editor on the same object would use, so a member keeps their name and color across surfaces.
 */
export const useAwarenessProvider = ({ id, messenger, identity }: AwarenessProviderOptions) => {
  const { identityKey, displayName, data } = identity ?? {};
  const hue = data?.hue;
  return useMemo(
    () =>
      createAwarenessProvider({
        id,
        messenger,
        identity: identityKey ? { identityKey, displayName, data: { hue } } : null,
      }),
    [id, messenger, identityKey, displayName, hue],
  );
};
