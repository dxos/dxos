import { Context } from 'effect';

type CredentialQuery = {
  service?: string;
};

// TODO(dmaretskyi): Unify with other apis.
// packages/sdk/schema/src/common/access-token.ts
type ServiceCredential = {
  service: string;

  // TODO(dmaretskyi): Build out.
  apiKey?: string;
};

export class CredentialsService extends Context.Tag('CredentialsService')<
  CredentialsService,
  {
    /**
     * Query all.
     */
    queryCredentials: (query: CredentialQuery) => Promise<ServiceCredential[]>;

    /**
     * Get a single credential.
     * @throws {Error} If no credential is found.
     */
    getCredential: (query: CredentialQuery) => Promise<ServiceCredential>;
  }
>() {}

export class ConfiguredCredentialsService implements Context.Tag.Service<CredentialsService> {
  constructor(private readonly credentials: ServiceCredential[] = []) {}

  addCredentials(credentials: ServiceCredential[]): ConfiguredCredentialsService {
    this.credentials.push(...credentials);
    return this;
  }

  async queryCredentials(query: CredentialQuery): Promise<ServiceCredential[]> {
    return this.credentials.filter((credential) => credential.service === query.service);
  }

  async getCredential(query: CredentialQuery): Promise<ServiceCredential> {
    const credential = this.credentials.find((credential) => credential.service === query.service);
    if (!credential) {
      throw new Error(`Credential not found for service: ${query.service}`);
    }
    return credential;
  }
}
