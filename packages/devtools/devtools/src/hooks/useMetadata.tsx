//
// Copyright 2023 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { SubscribeToMetadataResponseSchema } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useMetadata = () => {
  const devtoolsHost = useDevtools();
  const metadata = useStream(
    () => devtoolsHost.subscribeToMetadata(),
    buf.create(SubscribeToMetadataResponseSchema, {}),
  ).metadata;
  return metadata;
};
