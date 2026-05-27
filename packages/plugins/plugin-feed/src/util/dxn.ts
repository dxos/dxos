//
// Copyright 2026 DXOS.org
//

import { EchoURI, type ObjectId, type URI } from '@dxos/keys';

/**
 * Extracts the bare ECHO object id from a URI. Robust to URI form differences
 * — `echo:/<id>` (local), `echo://<spaceId>/<id>` (space-scoped) — by using
 * EchoURI.getObjectId.
 */
export const dxnToObjectId = (uri: URI.URI): ObjectId | URI.URI => EchoURI.getObjectId(EchoURI.tryParse(uri)!) ?? uri;
