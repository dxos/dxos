//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type Messenger } from '@dxos/protocols';
import { hexToHue } from '@dxos/util';

import { type GridAwareness, createGridAwareness } from './awareness.ts';

export type GridAwarenessOptions = {
  /** The object the grid shows. */
  id: string;
  /** The space's messenger; without it there is no channel. */
  messenger?: Messenger;
  identity?: { identityKey?: string; displayName?: string; data?: Record<string, unknown> } | null;
};

/**
 * The awareness channel for the object a grid shows, which `Grid.Root` opens while mounted. The member is named and
 * colored as the Markdown editor names them, so they look the same across surfaces.
 */
export const useGridAwareness = ({ id, messenger, identity }: GridAwarenessOptions): GridAwareness | undefined => {
  const { identityKey, displayName, data } = identity ?? {};
  const profileHue = typeof data?.hue === 'string' ? data.hue : undefined;
  return useMemo(() => {
    if (!messenger || !identityKey) {
      return undefined;
    }

    const hue = profileHue ?? hexToHue(identityKey);
    return createGridAwareness({
      messenger,
      objectId: id,
      peer: {
        peerId: identityKey,
        info: {
          displayName: displayName ?? generateName(identityKey),
          darkColor: `var(--color-${hue}-border)`,
          lightColor: `var(--color-${hue}-border)`,
          hue,
        },
      },
    });
  }, [id, messenger, identityKey, displayName, profileHue]);
};
