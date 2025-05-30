import { Context } from 'effect';

type CredentialQuery = {
  service?: string;
};

// TODO(dmaretskyi): Unify with other apis.
type ServiceCredential = {
  service: string;

  // TODO(dmaretskyi): Build out.
  apiKey?: string;
};

export class CredentialsService extends Context.Tag('CredentialsService')<
  CredentialsService,
  {
    queryCredentials: (query: CredentialQuery) => Promise<ServiceCredential[]>;
  }
>() {}

export class ConfiguredCredentialsService implements Context.Tag.Service<CredentialsService> {
  constructor(private readonly credentials: ServiceCredential[] = []) {}

  addCredentials(credentials: ServiceCredential[]): ConfiguredCredentialsService {
    this.credentials.push(...credentials);
    return this;
  }

  queryCredentials(query: CredentialQuery): Promise<ServiceCredential[]> {
    return Promise.resolve(this.credentials.filter((credential) => credential.service === query.service));
  }
}
