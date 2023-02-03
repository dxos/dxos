//
// Copyright 2020 DXOS.org
//

import React, { createContext, FC, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { Space } from '@dxos/client';

import { useClient } from '../client';
import { useSpaces } from './useSpaces';

export type SpaceContextProps = {
  space?: Space;
  setSpace: (space?: Space) => void;
};

export const SpaceContext: React.Context<SpaceContextProps> = createContext<SpaceContextProps>({ setSpace: () => {} });

export const SpaceProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const client = useClient();
  const spaces = useSpaces();
  const [space, setSpace] = useState<Space>();

  useEffect(() => {
    return client.shell?.spaceUpdate.on((spaceKey) => {
      const space = spaces.find((space) => space.key.equals(spaceKey));
      setSpace(space);
    });
  }, [client]);

  return <SpaceContext.Provider value={{ space, setSpace }}>{children}</SpaceContext.Provider>;
};

export const useSpaceSetter = () => {
  const { setSpace } = useContext(SpaceContext);
  return setSpace;
};

export const useCurrentSpace = () => {
  const { space } = useContext(SpaceContext);
  return space;
};
