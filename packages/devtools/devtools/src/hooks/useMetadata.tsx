//
// Copyright 2023 DXOS.org
//

import { useDevtools, useStream } from '@dxos/react-client/devtools';

export const useMetadata = (): any => {
  const devtoolsHost = useDevtools();
  const metadata = useStream(() => devtoolsHost.subscribeToMetadata({} as any), {} as any).metadata;
  return metadata;
};
