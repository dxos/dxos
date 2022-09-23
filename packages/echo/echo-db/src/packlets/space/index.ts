//
// Copyright 2022 DXOS.org
//

export * from './space';

// TODO(burdon): Why not * (if not then move other definitions).
export { SwarmIdentity } from './space-protocol';

// TODO(burdon): Why not * (if not then move other definitions).
export {
  AuthProvider,
  AuthVerifier,
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER
} from './auth-plugin';

export * from './space-manager';
