//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as AnsiDoc from '@effect/printer-ansi/AnsiDoc';

/**
 * Pretty print document.
 */
export const print = (doc: Doc.Doc<any>) => AnsiDoc.render(doc, { style: 'pretty' });

/**
 * Pretty prints a list of documents with ANSI colors.
 */
export const printList = (items: Array<Doc.Doc<any>>) =>
  AnsiDoc.render(Doc.vsep(items.map((item) => Doc.cat(item, Doc.hardLine))), { style: 'pretty' });
