//
// Copyright 2023 DXOS.org
//

import { useDevtools, useStream } from '@dxos/react-client';

export const useSpacesInfo = () => {
  const devtoolsHost = useDevtools();
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  return spaces;
};

export const useSpaceInfo = (spaceKey: string) => {
  const spaces = useSpacesInfo();
  const space = spaces.find((space) => space.key.equals(spaceKey));

  return space;
};
