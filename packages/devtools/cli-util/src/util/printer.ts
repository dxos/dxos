//
// Copyright 2025 DXOS.org
//

import * as Doc from './Doc.ts';

/**
 * Pretty print document.
 */
export const print = (doc: Doc.Doc<any>) => Doc.render(doc, { style: 'pretty' });

/**
 * Pretty prints a list of documents with ANSI colors.
 */
export const printList = (items: Array<Doc.Doc<any>>) =>
  Doc.render(Doc.vsep(items.map((item) => Doc.cat(item, Doc.hardLine))), { style: 'pretty' });
