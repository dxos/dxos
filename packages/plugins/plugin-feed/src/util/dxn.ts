//
// Copyright 2026 DXOS.org
//

import { EchoId, type ObjectId, type URI } from '@dxos/keys';

/**
 * Extracts the bare ECHO object id from a URI. Robust to URI form differences
 * — `echo:/<id>` (local), `echo://<spaceId>/<id>` (space-scoped) — by using
 * EchoId.getObjectId.
 */
export const dxnToObjectId = (uri: URI.URI): ObjectId | URI.URI => EchoId.getObjectId(EchoId.tryParse(uri)!) ?? uri;
