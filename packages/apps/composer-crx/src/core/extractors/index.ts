//
// Copyright 2026 DXOS.org
//

import { snapshotExtractor } from './snapshot';
import { type Extractor, type ExtractorContext } from './types';

export * from './snapshot';
export * from './types';

const extractors = new Map<string, Extractor>([[snapshotExtractor.name, snapshotExtractor]]);

/**
 * Run a bundled extractor by name. Throws on unknown names so callers
 * surface a stable error rather than shipping an empty payload.
 */
export const runExtractor = async (name: string, context: ExtractorContext): Promise<unknown> => {
  const extractor = extractors.get(name);
  if (!extractor) {
    throw new Error(`Unknown extractor: ${name}`);
  }
  return extractor.run(context);
};
