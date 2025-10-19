//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { FileInfoSchema } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/react-client/echo';

import { meta } from '../meta';

import { FileType } from './file';

export namespace WnfsAction {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: FileInfoSchema.pick('name', 'type', 'cid').pipe(Schema.required),
    output: Schema.Struct({
      object: FileType,
    }),
  }) {}

  export const UploadAnnotationId = Symbol.for(`${meta.id}/annotation/upload`);

  export const UploadFileSchema = Schema.Struct({
    file: Schema.instanceOf(File).annotations({
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
    input: Schema.extend(UploadFileSchema, Schema.Struct({ space: SpaceSchema })),
    output: Schema.required(FileInfoSchema),
  }) {}
}
