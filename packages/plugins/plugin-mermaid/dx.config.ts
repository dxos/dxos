//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { trim } from '@dxos/util';

import { MermaidNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MermaidNamespace.key,
    name: 'Mermaid',
    author: 'DXOS',
    description: trim`
      Generate diagrams from simple text-based definitions using Mermaid syntax.
      Create flowcharts, sequence diagrams, class diagrams, state diagrams, entity-relationship
      diagrams, Gantt charts, pie charts, Git graphs, mindmaps, and timelines — all from
      plain-text source embedded directly in your documents.

      The plugin integrates with the markdown editor as a CodeMirror extension.
      Any fenced code block tagged with the \`mermaid\` language identifier is automatically
      detected and replaced with a live SVG preview rendered by the Mermaid JS library.
      The raw source is revealed for editing whenever the cursor moves inside the block,
      then the rendered diagram is restored when the cursor moves away, providing a seamless
      live-preview experience without leaving the editor.

      Diagram rendering adapts to the editor's current color scheme: dark-mode documents
      use Mermaid's dark theme while light-mode documents use the neutral theme.
      Parse and render errors are shown inline in place of the diagram so that
      invalid syntax is immediately visible without disrupting the rest of the document.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-mermaid',
    icon: { key: 'ph--anchor-simple--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
  modules: [
    Capability.lazyModule(
      'MarkdownExtension',
      {
        environments: ['browser', 'tauri'],
        provides: [MarkdownCapabilities.ExtensionProvider],
        activatesOn: MarkdownEvents.Start,
      },
      () => import('./src/capabilities/markdown.ts', { with: { type: 'module-url' } }),
    ),
    // Gated on demand: nothing reads a spec at boot.
    Capability.lazyModule(
      'plugin-asset',
      {
        activatesOn: ActivationEvents.PluginAssetsRequested,
        provides: [AppCapabilities.PluginAsset],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
