//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { meta } from '#meta';

import * as FileType from './FileType';
import { FileAction } from './types';

const FILE_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${FILE_OPERATION}.create`, name: 'Create File' },
  input: Schema.extend(FileAction.CreateFileSchema, Schema.Struct({ db: Database.Database })),
  output: Schema.Struct({
    object: FileType.FileType,
  }),
});
