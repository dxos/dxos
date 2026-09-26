//
// Copyright 2026 DXOS.org
//

// The tab's side in a process with no WebAssembly at all: it loads the worker's saved bytes, applies
// changes the worker delivers, writes through the namespace, and prints what it holds. Run by
// `no-wasm.test.ts`; it must import nothing that loads Automerge.

import { readFileSync } from 'node:fs';

import * as Automerge from '../Automerge.ts';
import { encodeChange } from './encode.ts';
import { readChange } from './reader.ts';
import { TabDoc } from './tab-doc.ts';
import { TabImmutableString } from './values.ts';

type Input = { saved: string; changes: string[] };

type Shape = {
  content: string;
  title: TabImmutableString;
  items: { name: TabImmutableString; n: number }[];
  blob?: Uint8Array;
  meta?: { keys: TabImmutableString[]; at: Date };
};

const fromBase64 = (text: string): Uint8Array => Uint8Array.from(Buffer.from(text, 'base64'));
const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');

const parsed: unknown = JSON.parse(readFileSync(0, 'utf8'));
const isInput = (value: unknown): value is Input =>
  typeof value === 'object' &&
  value !== null &&
  'saved' in value &&
  typeof value.saved === 'string' &&
  'changes' in value &&
  Array.isArray(value.changes);
if (!isInput(parsed)) {
  throw new Error('Unexpected input');
}

// Nothing is registered behind the namespace, so a call the model does not answer throws.
const output = (() => {
  const tab = TabDoc.load<Shape>(fromBase64(parsed.saved), {});
  const loadedHeads = tab.heads();
  tab.applyChanges(parsed.changes.map((text) => readChange(fromBase64(text))));
  const before = tab.heads();
  const known = new Set(tab.changesIn(before).map((change) => change.hash));
  tab.change((draft) => {
    Automerge.splice(draft, ['content'], 0, 0, 'Tab: ');
    draft.title = new TabImmutableString('from the tab');
    draft.items.push({ name: new TabImmutableString('x'), n: 1 });
    draft.blob = new Uint8Array([1, 2, 3]);
    draft.meta = { keys: [new TabImmutableString('k')], at: new Date(5_000) };
  });
  const doc = tab.doc();
  const saved = Automerge.save(doc);
  if (!(saved instanceof Uint8Array)) {
    throw new Error('save gave no bytes');
  }
  return {
    webAssembly: typeof WebAssembly,
    loadedHeads,
    heads: tab.heads(),
    doc: JSON.stringify(doc),
    changes: tab
      .changesIn(tab.heads())
      .filter((change) => !known.has(change.hash))
      .map((change) => toBase64(encodeChange(change).bytes)),
    cursor: Automerge.getCursor(doc, ['content'], 3),
    diff: Automerge.diff(doc, before, tab.heads()),
    saved: toBase64(saved),
  };
})();

process.stdout.write(JSON.stringify(output));
