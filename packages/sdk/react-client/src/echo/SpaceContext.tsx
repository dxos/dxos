//
// Copyright 2020 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

export type SpaceContextProps = {
  space?: Space;
  setSpace: (space?: Space) => void;
};

export const SpaceContext: React.Context<SpaceContextProps> = createContext<SpaceContextProps>({ setSpace: () => {} });

export const SpaceProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [space, setSpace] = useState<Space>();
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

/**
 * Get a specific Space via its key.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpace = (spaceKey?: PublicKeyLike) => {
  const spaces = useSpaces();
  const space = spaces.find((space) => spaceKey && space.key.equals(spaceKey));

  return space;
};

/**
 * Get all Spaces available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpaces = () => {
  const client = useClient();
  const result = useMemo(() => client.echo.querySpaces(), [client]);
  const spaces: Space[] = useSyncExternalStore(
    (listener) => result.subscribe(listener),
    () => result.value
  );

  return spaces;
};
