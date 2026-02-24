//
// Copyright 2023 DXOS.org
//

import { type SubscribeToMetadataResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useMetadata = (): any => {
  const devtoolsHost = useDevtools();
  const metadata = useStream(() => devtoolsHost.subscribeToMetadata({} as any), {} as any).metadata;
  return metadata;
};
