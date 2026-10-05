//
// Copyright 2026 DXOS.org
//
import { fnv1a32 } from '@dxos/util';

// Currently holds only `hashText` for content-based change detection; reconcile/supersession proper
// (deleting or superseding prior facts when a source changes) is deferred.

/** Stable content hash of a document's text (FNV-1a; no crypto dep, deterministic). */
export const hashText = (text: string): string => fnv1a32(text).toString(16);
