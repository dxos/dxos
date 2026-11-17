//
// Copyright 2026 DXOS.org
//

import * as PublicationManifest from '@dxos/plugin-space/PublicationManifest';

export const PUBLICATIONS_PATH = PublicationManifest.PUBLICATIONS_PATH;

/** EDGE's URL for a path the viewer host serves under {@link PUBLICATIONS_PATH}. */
export const edgePublicationUrl = (pathname: string, edgeUrl: string): URL =>
  new URL(`${PublicationManifest.EDGE_PUBLICATIONS_PATH}${pathname.slice(PUBLICATIONS_PATH.length)}`, edgeUrl);
