//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.wnfs',
    name: 'WNFS',
    description: trim`
      Decentralized, end-to-end encrypted file storage for DXOS Composer built on the Web Native File System (WNFS) protocol.

      WNFS organizes files inside a cryptographic "dark forest" — a content-addressed private file system
      where each write produces a new immutable root CID. Files are stored as IPLD blocks (CIDv1, sha2-256),
      cached locally in IndexedDB, and asynchronously replicated to the DXOS edge blob service as CAR archives.
      Uploads and reads are scoped to a DXOS Space; the forest root CID is persisted atomically on the
      space's ECHO properties so the file system state survives across sessions and devices.

      The plugin registers as a \`FileCapabilities.Backend\` and \`FileCapabilities.UrlResolver\` so any plugin
      that uses \`plugin-file\` (e.g. \`plugin-gallery\`) can upload files and resolve \`wnfs://\` URLs without
      coupling to the storage implementation. The blockstore automatically queues blocks while offline and
      flushes them when connectivity is restored.
    `,
    icon: { key: 'ph--file-cloud--regular', hue: 'teal' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-wnfs',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.file'],
  },
});
