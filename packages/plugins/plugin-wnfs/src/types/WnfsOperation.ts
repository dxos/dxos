//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { FileInfoSchema } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { meta } from '#meta';

import { WnfsAction } from './types';
import * as WnfsFile from './WnfsFile';

const WNFS_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${WNFS_OPERATION}.create`, name: 'Create WNFS File' },
  services: [Capability.Service],
  input: FileInfoSchema.pick('name', 'type', 'cid').pipe(Schema.required),
  output: Schema.Struct({
    object: WnfsFile.WnfsFile,
  }),
});

export const Upload = Operation.make({
  meta: { key: `${WNFS_OPERATION}.upload`, name: 'Upload File' },
  services: [Capability.Service],
  input: Schema.extend(WnfsAction.UploadFileSchema, Schema.Struct({ db: Database.Database })),
  output: Schema.required(FileInfoSchema),
});

export const CreateFile = Operation.make({
  meta: { key: `${WNFS_OPERATION}.create-file`, name: 'Create File' },
  services: [Capability.Service],
  input: Schema.extend(WnfsAction.UploadFileSchema, Schema.Struct({ db: Database.Database })),
  output: Schema.Struct({
    object: WnfsFile.WnfsFile,
  }),
});
