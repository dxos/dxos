//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { TracingService } from '@dxos/protocols/proto/dxos/devtools/host';

/**
 * @deprecated
 */
export class TracingServiceImpl implements TracingService {
  constructor(private readonly _config: Config) {}

  async setTracingOptions() {
    throw new Error('Tracing not available.');
  }

  subscribeToRpcTrace(): any {
    throw new Error('Tracing not available.');
  }
}
