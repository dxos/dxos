//
// Copyright 2020 DXOS.org
//


import { Config } from '@dxos/config';
import { ECHO } from '@dxos/echo-db';

export interface CreateServicesOpts {
  config: Config,
  echo: ECHO
}
