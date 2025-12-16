//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { FileInfoSchema } from '@dxos/app-framework';
import { Database } from '@dxos/echo';

import { meta } from '../meta';

import * as File from './File';

export namespace WnfsAction {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: FileInfoSchema.pick('name', 'type', 'cid').pipe(Schema.required),
    output: Schema.Struct({
      object: File.File,
    }),
  }) {}

  export const UploadAnnotationId = Symbol.for(`${meta.id}/annotation/upload`);

  export const UploadFileSchema = Schema.Struct({
    file: Schema.instanceOf(File.File).annotations({
      [UploadAnnotationId]: {
        // Accept file types.
        'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
        'application/pdf': ['.pdf'],
        // TODO(wittjosiah): Add more file types.
      },
    }),
  });

  export type UploadFileForm = Schema.Schema.Type<typeof UploadFileSchema>;

  export class Upload extends Schema.TaggedClass<Upload>()(`${meta.id}/action/upload`, {
    input: Schema.extend(UploadFileSchema, Schema.Struct({ db: Database.Database })),
    output: Schema.required(FileInfoSchema),
  }) {}
}
