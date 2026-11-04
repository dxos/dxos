//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { createDiagramCache, mermaid } from '../extensions/index.ts';

export default Capability.makeModule(() => {
  // One for every editor, so a diagram rendered in one document shows at once in the next.
  const cache = createDiagramCache();
  return Effect.succeed(Capability.contribute(MarkdownCapabilities.ExtensionProvider, [() => mermaid({ cache })]));
});
