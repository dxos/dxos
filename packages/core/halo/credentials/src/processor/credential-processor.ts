//
// Copyright 2023 DXOS.org
//

import { runInContextAsync } from '@dxos/async';
import { Context } from '@dxos/context';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export interface CredentialProcessor {
  process(credential: Credential): Promise<void>;
}

export class CredentialConsumer<T extends CredentialProcessor> {
  private _ctx = new Context();

  /**
   * @internal
   * Processor is open are is ready to process live credentials.
   * NOTE: Setting this flag before all existing credentials are processed will cause them to be processed out of order.
   * Set externally.
   */
  _isReadyForLiveCredentials = false;

  constructor(
    public readonly processor: T,
    private readonly _onOpen: () => Promise<void>,
    private readonly _onClose: () => Promise<void>
  ) {}

  /**
   * @internal
   */
  async _process(credential: Credential) {
    await runInContextAsync(this._ctx, async () => {
      await this.processor.process(credential);
    });
  }

  async open() {
    if (this._ctx.disposed) {
      throw new Error('CredentialProcessor is disposed');
    }

    await this._onOpen();
  }

  async close() {
    await this._ctx.dispose();

    await this._onClose();
  }
}
