//
// Copyright 2026 DXOS.org
//

import { EDGE_PUBLICATIONS_PATH, PUBLICATIONS_PATH } from '@dxos/plugin-space/PublicationManifest';

export { PUBLICATIONS_PATH };

/** EDGE's URL for a path the viewer host serves under {@link PUBLICATIONS_PATH}. */
export const edgePublicationUrl = (pathname: string, edgeUrl: string): URL =>
  new URL(`${EDGE_PUBLICATIONS_PATH}${pathname.slice(PUBLICATIONS_PATH.length)}`, edgeUrl);
