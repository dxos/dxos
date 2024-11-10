//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';
import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { Storage, Envs, Local, Defaults, Config } from '@dxos/config';
import { Button } from '@dxos/react-ui';
import { runShell } from '@dxos/shell/react';

const main = async () => {
  const config = new Config(await Storage(), Envs(), Local(), Defaults());
  console.log('config', config);
  await runShell(config);
  const [client, setClient] = useState<Client>();
  useEffect(() => {
    setClient(new Client({ config, shell: './' }));
  }, []);

  return <Button onClick={() => client?.shell.shareIdentity()} />;
};

void main();
