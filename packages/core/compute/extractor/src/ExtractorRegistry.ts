//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type ObjectExtractor } from './ObjectExtractor';

/**
 * Registry of the available {@link ObjectExtractor}s. Upstream of, and independent from,
 * app-framework Capabilities — consuming plugins build this layer from whatever registration
 * mechanism they use (e.g. `Capability.getAll`) so this package stays framework-free.
 */
export class ExtractorRegistry extends Context.Tag('@dxos/extractor/ExtractorRegistry')<
  ExtractorRegistry,
  {
    readonly all: () => Effect.Effect<ReadonlyArray<ObjectExtractor>>;
  }
>() {}

export const fromExtractors = (extractors: ReadonlyArray<ObjectExtractor>) =>
  Layer.succeed(
    ExtractorRegistry,
    ExtractorRegistry.of({
      all: () => Effect.succeed(extractors),
    }),
  );
