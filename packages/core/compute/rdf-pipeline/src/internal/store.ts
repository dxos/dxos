//
// Copyright 2026 DXOS.org
//

import { DataFactory, Store, type Quad } from 'n3';

const { defaultGraph } = DataFactory;

/** Clone all quads from a store into a new N3 store. */
export const cloneStore = (source: Store): Store => {
  const next = new Store();
  for (const quad of source.getQuads(null, null, null, null)) {
    next.addQuad(quad);
  }
  return next;
};

/** Materialize quads into a fresh store. */
export const storeFromQuads = (quads: Iterable<Quad>): Store => {
  const store = new Store();
  for (const quad of quads) {
    store.addQuad(quad);
  }
  return store;
};

export const defaultGraphNode = defaultGraph();
