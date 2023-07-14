//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Config } from '@dxos/protocols/proto/dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { useClientServices } from '@dxos/react-client';

import { JsonView, PanelContainer } from '../../components';

const ConfigPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  const [config, setConfig] = useState<Config>({});
  useAsyncEffect(async () => {
    setConfig(await services.SystemService.getConfig());
  }, []);

  return (
    <PanelContainer>
      <JsonView data={config} />
    </PanelContainer>
  );
};

export default ConfigPanel;
