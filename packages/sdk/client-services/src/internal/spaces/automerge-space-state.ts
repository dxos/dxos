//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { type CredentialProcessor, type SpecificCredential, specificCredential } from '@dxos/credentials';
import { type Credential, type Epoch } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

export class AutomergeSpaceState extends Resource implements CredentialProcessor {
  public rootUrl: string | undefined = undefined;
  public lastEpoch: SpecificCredential<Epoch> | undefined = undefined;

  public readonly onNewEpoch = new Event<SpecificCredential<Epoch>>();

  private _isProcessingRootDocs = false;

  constructor(private readonly _onNewRoot: (rootUrl: string) => void) {
    super();
  }

  protected override async _open(ctx: Context): Promise<void> {}

  protected override async _close(ctx: Context): Promise<void> {
    this._isProcessingRootDocs = false;
  }

  async processCredential(credential: Credential): Promise<void> {
    const epoch = specificCredential<Epoch>(credential, 'dxos.halo.credentials.Epoch');
    if (!epoch) {
      return;
    }

    this.lastEpoch = epoch;
    if (epoch.assertion.automergeRoot) {
      this.rootUrl = epoch.assertion.automergeRoot;

      if (this._isProcessingRootDocs) {
        this._onNewRoot(this.rootUrl);
      }
    }

    this.onNewEpoch.emit(epoch);
  }

  startProcessingRootDocs(): void {
    if (this._isProcessingRootDocs) {
      return;
    }

    if (this.rootUrl) {
      this._onNewRoot(this.rootUrl);
    }
    this._isProcessingRootDocs = true;
  }

  async ensureEpochInitialized(): Promise<void> {
    await this.onNewEpoch.waitForCondition(() => !!this.lastEpoch);
  }
}
