//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { FileNamespace } from './src/namespace.ts';
import * as FileCapabilities from './src/types/FileCapabilities.ts';
import * as FileEvents from './src/types/FileEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: FileNamespace.key,
    name: 'File',
    author: 'DXOS',
    description: trim`
      FilePlugin enables DXOS Composer to store and preview binary files - images, videos, and PDFs - as
      first-class ECHO objects. Uploaded bytes are routed through a pluggable backend system: the built-in
      inline backend serialises the file directly onto the ECHO document, while external backends (e.g. WNFS)
      can be contributed by other plugins.

      Accepted formats are images (jpg, jpeg, png, gif, webp, svg), videos (mp4, webm, mov), and PDFs,
      up to a 4 MB limit per file for the inline backend (other backends scale beyond it). The preview
      surface renders the appropriate HTML element for each MIME class and surfaces inside article,
      section, and slide roles.

      A File object's \`data\` field is a reference to a \`Blob\` ECHO object (from \`@dxos/echo\`), which
      abstracts where bytes actually live. \`Blob.url\`/\`Blob.read\` resolve a renderable URL or the raw
      bytes regardless of backend, keeping the File object schema backend-agnostic without a separate
      URL-resolver capability. A companion Markdown extension allows file objects to be embedded directly
      in Markdown documents.

      Backend selection is user-configurable in the plugin settings panel, which lists all registered
      backends with their descriptions. Selecting a backend persists the choice to the ECHO-backed settings
      atom so the preference is shared across devices.
    `,
    icon: { key: 'ph--file--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-file',
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
  modules: [
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
    ),
    Capability.lazyModule(
      'EdgeBackend',
      {
        requires: [ClientCapabilities.Client],
        provides: [FileCapabilities.Backend],
        activatesOn: FileEvents.Start,
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
      () => import('./src/capabilities/edge-backend.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: it serves the UI's upload action, and a headless host (EDGE's operation-service)
    // has no operation invoker, so activating it there fails the plugin and with it every file backend.
    Capability.lazyModule(
      'FileUploader',
      {
        requires: [Capabilities.OperationInvoker],
        provides: [AppCapabilities.FileUploader],
        activatesOn: FileEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/file-uploader.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'InlineBackend',
      {
        provides: [FileCapabilities.Backend],
        activatesOn: FileEvents.Start,
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
      () => import('./src/capabilities/inline-backend.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: the `image` editor extension mounts a React tree into the CodeMirror widget via
    // `react-dom/client`.
    Capability.lazyModule(
      'MarkdownExtension',
      {
        provides: [MarkdownCapabilities.ExtensionProvider],
        activatesOn: MarkdownEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: FileNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.role.article',
        'org.dxos.role.cardContent',
        'org.dxos.role.formInput',
        'org.dxos.role.objectProperties',
        'org.dxos.role.section',
        'org.dxos.role.slide',
      ],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [FileCapabilities.SettingsAtom],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
