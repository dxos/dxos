//
// Copyright 2026 DXOS.org
//

export { EngineCore, type EngineOptions, SqlSparqlEngine } from './engine.ts';
export { type Program, type Result, type Statement, exec, raw, rows, runSync } from './program.ts';
export { InvalidSparqlError, UnsupportedSparqlError } from './errors.ts';
export { type Quad, RDF, type Row, type Term, XSD, iri, lit } from './terms.ts';

export { type SqlStorage, type SqlStorageCursor, type SqlStorageValue } from './sql-storage.ts';
export { INDEX_SETS, type IndexSet } from './store.ts';
export { type Tables, tables } from './tables.ts';
