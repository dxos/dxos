//
// Copyright 2025 DXOS.org
//

// The binding API lives on the `./binding` subpath, not here — see `src/binding.ts`.
export * as ConnectorPlugin from './ConnectorPlugin';
export { ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, connectorAuthActions } from './util';
export { ConnectionTestError } from './errors';
export * from '#meta';
export * from '#types';
