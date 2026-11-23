//
// Copyright 2026 DXOS.org
//

import { Defuddle, type DefuddleResponse } from 'defuddle/node';

/**
 * workerd has no `DOMParser`, so it always takes the `defuddle/node` path; importing it alone keeps
 * defuddle's DOM build out of the worker bundle. `prune` needs a DOM and is skipped.
 */
export const parseArticle = (
  html: string,
  url: string | undefined,
  _prune: (doc: Document) => void,
): Promise<DefuddleResponse> => Defuddle(html, url, { separateMarkdown: true });
