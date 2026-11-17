//
// Copyright 2026 DXOS.org
//

/** Where the viewer host serves a publication's public files. */
export const PUBLICATIONS_PATH = '/publications';

/** Where EDGE serves the same files. */
export const EDGE_PUBLICATIONS_PATH = '/db/publications';

/** EDGE's URL for a path the viewer host serves under {@link PUBLICATIONS_PATH}. */
export const edgePublicationUrl = (pathname: string, edgeUrl: string): URL =>
  new URL(`${EDGE_PUBLICATIONS_PATH}${pathname.slice(PUBLICATIONS_PATH.length)}`, edgeUrl);
