//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { toPublicKey } from '@dxos/protocols/buf';
import { SubscribeToSpacesResponseSchema } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useSpacesInfo = () => {
  const devtoolsHost = useDevtools();
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), create(SubscribeToSpacesResponseSchema)).spaces;
  return spaces;
};

export const useSpaceInfo = (spaceKey: string) => {
  const spaces = useSpacesInfo();
  const space = spaces.find((space) => toPublicKey(space.key)?.equals(spaceKey));
  return space;
};
