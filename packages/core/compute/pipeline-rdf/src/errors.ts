//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class SemanticIndexError extends BaseError.extend('SemanticIndexError', 'Semantic index error') {}

/**
 * A store refusing an operation it does not offer at all (a write-only fact feed asked to read), as opposed to one that
 * failed; a subclass so every `FactStoreApi` signature stays the same.
 */
export class FactStoreUnsupportedError extends SemanticIndexError {}
