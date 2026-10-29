//
// Copyright 2023 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';
import { trim } from '@dxos/util';

import { WnfsNamespace } from './src/namespace.ts';
import * as WnfsCapabilities from './src/types/WnfsCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: WnfsNamespace.key,
    name: 'WNFS',
    author: 'DXOS',
    description: trim`
      Decentralized, end-to-end encrypted file storage for DXOS Composer built on the Web Native File System (WNFS) protocol.

      WNFS organizes files inside a cryptographic "dark forest" - a content-addressed private file system
      where each write produces a new immutable root CID. Files are stored as IPLD blocks (CIDv1, sha2-256),
      cached locally in IndexedDB, and asynchronously replicated to the DXOS edge blob service as CAR archives.
      Uploads and reads are scoped to a DXOS Space; the forest root CID is persisted atomically on the
      space's ECHO properties so the file system state survives across sessions and devices.

      The plugin registers a \`BlobBackend\` on the ECHO Hypergraph (and a matching \`FileCapabilities.Backend\`
      descriptor) so any plugin that uses \`plugin-file\` (e.g. \`plugin-studio\`) can upload files and resolve
      \`wnfs://\` URLs without coupling to the storage implementation. The blockstore automatically queues
      blocks while offline and flushes them when connectivity is restored.
    `,
    icon: { key: 'ph--file-cloud--regular', hue: 'teal' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-wnfs',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.file'],
  },
  modules: [
    Capability.lazyModule(
      'BlobBackend',
      {
        // Blockstore/Instances are awaited in the module body, not declared here: they are absent by
        // design when EDGE is unconfigured.
        requires: [ClientCapabilities.Client],
        provides: [FileCapabilities.Backend],
        activatesOn: FileEvents.Start,
      },
      () => import('./src/capabilities/blob-backend.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Dependencies',
      {
        requires: [ClientCapabilities.Client],
        // The file plugin's start, not wnfs's own: wnfs contributes no surface, so nothing would
        // ever fire its own start - and these are exactly what the blob backend above waits for.
        provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
        activatesOn: FileEvents.Start,
      },
      () => import('./src/capabilities/dependencies.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: WnfsNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
