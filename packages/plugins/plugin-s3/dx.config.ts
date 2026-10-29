//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';
import { trim } from '@dxos/util';

import { S3Namespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: S3Namespace.key,
    name: 'S3 Storage',
    author: 'DXOS',
    description: trim`
      Stores files in an S3-compatible bucket (Cloudflare R2, AWS S3, MinIO). It registers a Connector
      that captures the bucket endpoint and access keys, and a Blob backend that reads and writes objects
      directly from the browser using SigV4-signed requests. Credentials are resolved per space at call
      time via CredentialsService. Public buckets can be read without any credential. This plugin is
      headless - it contributes a storage backend and a connector, and has no UI surfaces of its own.
    `,
    icon: { key: 'ph--cloud-arrow-up--regular', hue: 'orange' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-s3',
    dependsOn: ['org.dxos.plugin.file'],
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'Connector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'BlobBackend',
      {
        requires: [ClientCapabilities.Client],
        provides: [FileCapabilities.Backend],
        // The file plugin's start, not this plugin's own: it contributes no surface, so nothing would
        // ever fire an own-start event for it.
        activatesOn: FileEvents.Start,
      },
      () => import('./src/capabilities/blob-backend.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
