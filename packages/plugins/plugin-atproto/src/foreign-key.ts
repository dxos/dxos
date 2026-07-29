//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * Foreign-key source for atproto records. Publishing stamps `{ source, id: <at-uri> }` on the ECHO
 * object; import stamps the same, so re-publish/dedup recognizes an already-published object
 * (`Filter.foreignKeys(type, [atprotoForeignKey(uri)])`).
 */
export const ATPROTO_SOURCE = 'atproto';

export const atprotoForeignKey = (uri: string) => ({ source: ATPROTO_SOURCE, id: uri });

/** AT-URIs this object has been published to. */
export const getAtprotoUris = (object: Obj.Unknown): string[] =>
  Obj.getKeys(object, ATPROTO_SOURCE).map((key) => key.id);
