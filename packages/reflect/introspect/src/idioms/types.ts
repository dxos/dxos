//
// Copyright 2026 DXOS.org
//

// Re-export the Idiom shapes that live in @dxos/introspect-tools so internal
// callers (scan.ts, introspector.ts) don't take a runtime dep on Effect — and
// the contract stays in one place for browser-side consumers.

export type { Idiom, IdiomHost, IdiomHostKind } from '@dxos/introspect-tools';
