//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';

const FILESYSTEM_OPERATION = `${meta.id}.operation`;

export const OpenDirectory = Operation.make({
  meta: { key: `${FILESYSTEM_OPERATION}.open-directory`, name: 'Open Folder' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Union(Schema.Void, Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) })),
});

export const CloseDirectory = Operation.make({
  meta: { key: `${FILESYSTEM_OPERATION}.close-directory`, name: 'Close Folder' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});

export const RefreshDirectory = Operation.make({
  meta: { key: `${FILESYSTEM_OPERATION}.refresh-directory`, name: 'Refresh Folder' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});
