//
// Copyright 2020 DXOS.org
//

import React, { Context, createContext, FC, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { IFrameClientServicesProxy, Space } from '@dxos/client';

import { useClient } from '../client';
import { useSpaces } from './useSpaces';

export type SpaceContextProps = {
  space?: Space;
  setSpace: (space?: Space) => void;
};

export const SpaceContext: Context<SpaceContextProps> = createContext<SpaceContextProps>({ setSpace: () => {} });

export const SpaceProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const client = useClient();
  const spaces = useSpaces();
  const [space, setSpace] = useState<Space | undefined>(() => {
    if (client.services instanceof IFrameClientServicesProxy) {
      const spaceKey = client.services.spaceKey;
      return spaces.find((space) => spaceKey && space.key.equals(spaceKey));
    }
  });

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy) {
      return client.services.contextUpdate?.on(({ spaceKey }) => {
        const space = spaces.find((space) => spaceKey && space.key.equals(spaceKey));
        setSpace(space);
      });
    }
  }, [client]);

  return <SpaceContext.Provider value={{ space, setSpace }}>{children}</SpaceContext.Provider>;
};

/**
 * Uses space state from the space context.
 */
export const useCurrentSpace = (): [Space | undefined, (space?: Space) => void] => {
  const client = useClient();
  const { space, setSpace: naturalSetSpace } = useContext(SpaceContext);

  const setSpace = (space?: Space) => {
    if (client.services instanceof IFrameClientServicesProxy) {
      client.services.setCurrentSpace(space?.key);
    }

    naturalSetSpace(space);
  };

  return [space, setSpace];
};
