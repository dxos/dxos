//
// Copyright 2023 DXOS.org
//

import { ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

export const getLocalTelemetryTags = async () => {
  const localKubeConfigUrl = 'http://kube.local/.well-known/dx/config';

  log('fetching config...', { localKubeConfigUrl });
  return await fetch(localKubeConfigUrl)
    .then((res) => (res.json() as ConfigProto).runtime?.kube?.telemetry?.tags)
    .catch((error) => {
      log('Failed to fetch telemetry tags', error);
      return [];
    });
};
