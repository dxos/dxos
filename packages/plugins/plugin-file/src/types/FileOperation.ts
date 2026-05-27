//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';
import { File } from '@dxos/types';

import { meta } from '#meta';

import { FileAction } from './types';

const FILE_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const Create = Operation.make({
  meta: { key: DXN.make(`${FILE_OPERATION}.create`), name: 'Create File', icon: 'ph--file--regular' },
  services: [Capability.Service],
  input: Schema.extend(FileAction.CreateFileSchema, Schema.Struct({ db: Database.Database })),
  output: Schema.Struct({
    object: File.File,
  }),
});
