//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';

import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { mermaid } from './extensions';

export const MermaidPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => Effect.succeed(Capability.contributes(MarkdownCapabilities.Extensions, [mermaid])),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default MermaidPlugin;
