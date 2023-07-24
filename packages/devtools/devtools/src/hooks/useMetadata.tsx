//
// Copyright 2023 DXOS.org
//

import { SubscribeToMetadataResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useMetadata = () => {
  const devtoolsHost = useDevtools();
  const metadata = useStream(() => devtoolsHost.subscribeToMetadata(), {} as SubscribeToMetadataResponse).metadata;
  return metadata;
};
