//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import { File as FileType } from '@dxos/types';

import { meta } from '#meta';

import { FileAction } from './types';

const FILE_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${FILE_OPERATION}.create`, name: 'Create File' },
  services: [Capability.Service],
  input: Schema.extend(FileAction.CreateFileSchema, Schema.Struct({ db: Database.Database })),
  output: Schema.Struct({
    object: FileType.File,
  }),
});
