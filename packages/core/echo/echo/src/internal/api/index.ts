//
// Copyright 2025 DXOS.org
//

/**
 * Shared API helpers for Obj and Relation modules.
 * These implementations use generic Entity types.
 * Obj and Relation modules re-export with strongly-typed signatures.
 *
 * TODO(wittjosiah): Could this become the new "internal" where we slowly refactor
 * existing internal modules into here? This would provide a cleaner boundary
 * and prevent external packages from using internals directly.
 */

export * from './annotations';
export * from './entity';
export * from './meta';
export * from './sorting';
export * from './version';
