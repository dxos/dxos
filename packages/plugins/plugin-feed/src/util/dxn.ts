//
// Copyright 2026 DXOS.org
//

import { EchoId } from '@dxos/keys';

/**
 * Extracts the bare ECHO object id from a URI. Robust to URI form differences
 * — `echo:/<id>` (local), `echo://<spaceId>/<id>` (space-scoped) — by using
 * EchoId.getObjectId.
 */
export const dxnToObjectId = (uri: string): string => EchoId.getObjectId(EchoId.tryParse(uri)!) ?? uri;
