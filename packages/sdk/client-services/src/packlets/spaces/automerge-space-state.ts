//
// Copyright 2023 DXOS.org
//

import { type CredentialProcessor, type SpecificCredential, checkCredentialType } from '@dxos/credentials';
import { type Credential, type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';

export class AutomergeSpaceState implements CredentialProcessor {
  public rootUrl: string | undefined = undefined;
  public lastEpoch: SpecificCredential<Epoch> | undefined = undefined;

  private _isProcessingRootDocs = false;

  constructor(private readonly _onNewRoot: (rootUrl: string) => void) {}

  async processCredential(credential: Credential) {
    if (!checkCredentialType(credential, 'dxos.halo.credentials.Epoch')) {
      return;
    }

    this.lastEpoch = credential;
    if (credential.subject.assertion.automergeRoot) {
      this.rootUrl = credential.subject.assertion.automergeRoot;

      if (this._isProcessingRootDocs) {
        this._onNewRoot(this.rootUrl);
      }
    }
  }

  startProcessingRootDocs() {
    if (this._isProcessingRootDocs) {
      return;
    }

    if (this.rootUrl) {
      this._onNewRoot(this.rootUrl);
    }
    this._isProcessingRootDocs = true;
  }
}
