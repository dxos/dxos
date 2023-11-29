import { CredentialProcessor, SpecificCredential, checkCredentialType } from "@dxos/credentials";
import { Credential, Epoch } from "@dxos/protocols/proto/dxos/halo/credentials";

export class AutomergeSpaceState implements CredentialProcessor {
  public rootUrl: string | undefined = undefined;
  public lastEpoch: SpecificCredential<Epoch> | undefined = undefined;

  async processCredential(credential: Credential) {
    if(!checkCredentialType(credential, 'dxos.halo.credentials.Epoch')) {
      return;
    }

    this.lastEpoch = credential;
    if(credential.subject.assertion.automergeRoot) {
      this.rootUrl = credential.subject.assertion.automergeRoot;
    }
  }
}