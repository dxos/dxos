//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref, Type } from '@dxos/echo';
import { ContentBlock, File } from '@dxos/types';

import { meta } from '#meta';

import * as FileCapabilities from './FileCapabilities';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create File', icon: 'ph--file--regular' },
  services: [Capability.Service],
  input: FileCapabilities.FileAction.CreateFileSchema.mapFields(Struct.assign({ db: Database.Database })),
  output: Schema.Struct({
    object: Type.getSchema(File.File),
  }),
});

export const Read = Operation.make({
  meta: {
    key: makeKey('read'),
    name: 'Read File',
    description:
      'Reads the contents of a file and returns them as a File content block (data URL for inline files, original URL for external files).',
    icon: 'ph--file-arrow-down--regular',
  },
  input: Schema.Struct({
    file: Ref.Ref(File.File).annotate({
      description: 'The file to read.',
    }),
  }),
  output: ContentBlock.ContentBlockResult,
  services: [Database.Service],
});
