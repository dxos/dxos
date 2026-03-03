//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';

import { mermaid } from './extensions';
import { meta } from './meta';

export const MermaidPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => Effect.succeed(Capability.contributes(MarkdownCapabilities.Extensions, [mermaid])),
  }),
  Plugin.make,
);
