//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A valid SPARQL construct the compiler does not translate to SQL. */
export class UnsupportedSparqlError extends BaseError.extend('UnsupportedSparqlError', 'Unsupported SPARQL construct') {
  constructor(construct: string) {
    super({ message: `Unsupported SPARQL construct: ${construct}` });
  }
}

/** A query the SPARQL algebra rejects (e.g. BIND to an in-scope variable). */
export class InvalidSparqlError extends BaseError.extend('InvalidSparqlError', 'Invalid SPARQL query') {
  constructor(reason: string) {
    super({ message: `Invalid SPARQL query: ${reason}` });
  }
}
