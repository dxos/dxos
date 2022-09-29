//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { TracingService as TracingServiceRpc } from '@dxos/protocols/proto/dxos/devtools';

/**
 *
 */
export class TracingService implements TracingServiceRpc {
  constructor (
    private readonly _config: Config
  ) {}

  async setTracingOptions () {
    throw new Error('Tracing not available.');
  }

  subscribeToRpcTrace (): any {
    throw new Error('Tracing not available.');
  }
}
