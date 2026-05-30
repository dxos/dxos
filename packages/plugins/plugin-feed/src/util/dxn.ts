//
// Copyright 2026 DXOS.org
//

import { EID, type EntityId, type URI } from '@dxos/keys';

/**
 * Extracts the bare ECHO object id from a URI. Robust to URI form differences
 * — `echo:/<id>` (local), `echo://<spaceId>/<id>` (space-scoped) — by using
 * EID.getEntityId.
 */
export const dxnToEntityId = (uri: URI.URI): EntityId | URI.URI => EID.getEntityId(EID.tryParse(uri)!) ?? uri;
