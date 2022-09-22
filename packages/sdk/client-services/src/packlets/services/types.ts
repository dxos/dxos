//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';

import { ServiceContext } from './service-context';
import { HaloSigner } from './signer';

export type CreateServicesOpts = {
  config: Config
  /**
   * @deprecated
   */
  echo: any
  context: ServiceContext
  signer?: HaloSigner
}
