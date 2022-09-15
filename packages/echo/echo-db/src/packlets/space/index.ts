//
// Copyright 2022 DXOS.org
//

export * from './space';

// TODO(burdon): Why not * (if not then move other definitions).
export {
  SwarmIdentity,
  CredentialProvider,
  CredentialAuthenticator,
  MOCK_CREDENTIAL_AUTHENTICATOR,
  MOCK_CREDENTIAL_PROVIDER
} from './space-protocol';
