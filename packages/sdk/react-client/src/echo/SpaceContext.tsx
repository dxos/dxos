//
// Copyright 2020 DXOS.org
//

import React, { Context, createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { IFrameClientServicesProxy, PublicKey, Space } from '@dxos/client';
import { raise } from '@dxos/debug';

import { useClient } from '../client';
import { useSpaces } from './useSpaces';

export type SpaceContextProps = {
  spaceKey?: PublicKey;
  setSpaceKey: (spaceKey?: PublicKey) => void;
};

export const SpaceContext: Context<SpaceContextProps> = createContext<SpaceContextProps>({ setSpaceKey: () => {} });

export type SpaceProviderProps = PropsWithChildren<{
  initialSpaceKey?: PublicKey | ((spaces: Space[]) => PublicKey);
  onSpaceChange?: (spaceKey?: PublicKey) => void;
}>;

export const SpaceProvider = ({ initialSpaceKey, onSpaceChange, children }: SpaceProviderProps) => {
  const client = useClient();
  const spaces = useSpaces();
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(() => {
    if (typeof initialSpaceKey === 'function') {
      return initialSpaceKey(spaces);
    }

    return initialSpaceKey ?? spaces[0]?.key;
  });

  useEffect(() => {
    onSpaceChange?.(spaceKey);

    if (client.services instanceof IFrameClientServicesProxy) {
      void client.services.setCurrentSpace(spaceKey);
    }
  }, [spaceKey]);

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy) {
      return client.services.contextUpdate?.on(({ spaceKey }) => {
        setSpaceKey(spaceKey);
      });
    }
  }, [client]);

  return <SpaceContext.Provider value={{ spaceKey, setSpaceKey }}>{children}</SpaceContext.Provider>;
};

/**
 * Uses space state from the space context.
 */
export const useCurrentSpace = (): [Space | undefined, (spaceKey?: PublicKey) => void] => {
  const { spaceKey, setSpaceKey } = useContext(SpaceContext) ?? raise(new Error('No space context'));
  const spaces = useSpaces();
  const space = useMemo(() => spaces.find((space) => spaceKey?.equals(space.key)), [spaceKey]);
  return [space, setSpaceKey];
};
