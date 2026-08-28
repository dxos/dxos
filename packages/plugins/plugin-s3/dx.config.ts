//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.s3',
    name: 'S3 Storage',
    author: 'DXOS',
    description: trim`
      Stores files in an S3-compatible bucket (Cloudflare R2, AWS S3, MinIO). It registers a Connector
      that captures the bucket endpoint and access keys, and a Blob backend that reads and writes objects
      directly from the browser using SigV4-signed requests. Credentials are resolved per space at call
      time via CredentialsService. Public buckets can be read without any credential. This plugin is
      headless — it contributes a storage backend and a connector, and has no UI surfaces of its own.
    `,
    icon: { key: 'ph--cloud-arrow-up--regular', hue: 'orange' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-s3',
    dependsOn: ['org.dxos.plugin.file'],
    tags: ['labs'],
  },
});
