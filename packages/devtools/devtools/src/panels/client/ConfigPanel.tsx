//
// Copyright 2020 DXOS.org
//

import React from 'react';

// import { Config } from '@dxos/protocols/proto/dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { useClientServices, useConfig } from '@dxos/react-client';

import { JsonView, PanelContainer } from '../../components';

const ConfigPanel = () => {
  const config = useConfig();
  const services = useClientServices();
  // const [config, setConfig] = useState<Config>({});
  useAsyncEffect(async () => {
    if (services) {
      // const config = await services.SystemService.getConfig();
      // setConfig(config);
    }
  }, [services]);

  return (
    <PanelContainer>
      <JsonView data={config.values} />
    </PanelContainer>
  );
};

export default ConfigPanel;
