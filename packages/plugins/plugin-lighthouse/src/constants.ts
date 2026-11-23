//
// Copyright 2026 DXOS.org
//

/** Stored as `Connection.connectorId`. */
export const LIGHTHOUSE_CONNECTOR_ID = 'org.dxos.plugin.lighthouse.connector';

/** `AccessToken.source` when the server URL has no host to name it by. */
export const LIGHTHOUSE_TOKEN_SOURCE = 'lighthouse.local';

/** The workspace daemon's TCP listener (lighthouse-api F-2.4). */
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:4319';

/** Companion variant of the selected result's detail. */
export const RESULT_COMPANION = 'result';

/** The companion's subject: a sentinel, since the result it shows is read live and is not an ECHO object. */
export const RESULT_COMPANION_DATA = 'org.dxos.plugin.lighthouse.result';

/** Companion variant of a lighthouse connection's meta (plugins, vocabulary, issues, storage). */
export const META_COMPANION = 'lighthouse';

/** The meta companion's subject: a sentinel, like the result companion's. */
export const META_COMPANION_DATA = 'org.dxos.plugin.lighthouse.meta';
