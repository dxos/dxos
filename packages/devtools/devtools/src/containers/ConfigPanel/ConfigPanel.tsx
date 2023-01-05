//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Config } from '@dxos/protocols/proto/dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { useClientServices } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

export const ConfigPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  const [config, setConfig] = useState<Config>({});
  useAsyncEffect(async () => {
    setConfig(await services.SystemService.getConfig());
  }, []);
  return <JsonTreeView size='small' depth={4} data={config} />;
};
