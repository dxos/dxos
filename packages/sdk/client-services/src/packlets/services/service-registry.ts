//
// Copyright 2022 DXOS.org
//

import { ServiceBundle } from '@dxos/rpc';

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  // prettier-ignore
  constructor (
    private readonly _serviceBundle: ServiceBundle<Services>,
    private readonly _handlers: Services
  ) {}

  get descriptors() {
    return this._serviceBundle;
  }

  get services() {
    return this._handlers;
  }
}
