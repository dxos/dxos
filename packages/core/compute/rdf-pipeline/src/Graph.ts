//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { Store, type Quad } from 'n3';

import { RdfPipelineError } from './errors';
import { makeEngine } from './internal/engine';
import { cloneStore } from './internal/store';

/**
 * Mutable RDF graph backed by an N3 {@link Store} and queried through Comunica.
 * Mutations return a successor graph and detach the prior instance so pipeline stages
 * cannot accidentally reuse stale state.
 */
export class Graph {
  readonly #store: Store;
  readonly #engine: QueryEngine;
  #attached = true;

  constructor(store: Store, engine: QueryEngine) {
    this.#store = store;
    this.#engine = engine;
  }

  /** Whether this graph can still be branched from. */
  get attached(): boolean {
    return this.#attached;
  }

  /** RDF/JS source for Comunica `sources`. */
  get source(): Store {
    return this.#store;
  }

  /** Shared Comunica engine for this graph lineage. */
  get engine(): QueryEngine {
    return this.#engine;
  }

  /** All quads in the default graph. */
  getQuads(): Quad[] {
    return this.#store.getQuads(null, null, null, null);
  }

  /** Empty graph with a fresh store. */
  static empty(engine?: QueryEngine): Graph {
    return new Graph(new Store(), engine ?? makeEngine());
  }

  /** Graph containing the given quads. */
  static fromQuads(quads: Iterable<Quad>, engine?: QueryEngine): Graph {
    const store = new Store();
    for (const quad of quads) {
      store.addQuad(quad);
    }
    return new Graph(store, engine ?? makeEngine());
  }

  /** Clone the underlying store without detaching this graph. */
  cloneStore(): Store {
    return cloneStore(this.#store);
  }

  /**
   * Produce a successor graph backed by `store`, detaching this instance.
   * Throws {@link RdfPipelineError} as a synchronous defect if already superseded.
   */
  successor(store: Store): Graph {
    if (!this.#attached) {
      throw new RdfPipelineError({ message: 'Graph has been detached' });
    }
    this.#attached = false;
    return new Graph(store, this.#engine);
  }

  clone(): Graph {
    return new Graph(this.cloneStore(), this.#engine);
  }
}
