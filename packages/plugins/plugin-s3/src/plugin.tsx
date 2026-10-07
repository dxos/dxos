//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { BlobBackend, Connector } from '#capabilities';
import { meta } from '#meta';

export const S3Plugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(BlobBackend),
  Plugin.make,
);

export default S3Plugin;
