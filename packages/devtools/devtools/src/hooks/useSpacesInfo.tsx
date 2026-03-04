//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { decodePublicKey } from '@dxos/protocols/buf';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useSpacesInfo = (): any[] => {
  const devtoolsHost = useDevtools();
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({} as any), {} as any).spaces ?? [];
  return spaces;
};

export const useSpaceInfo = (spaceKey: string): any => {
  const spaces = useSpacesInfo();
  const space = spaces.find(
    (space: any) => space.key && decodePublicKey(space.key).equals(PublicKey.fromHex(spaceKey)),
  );
  return space;
};
