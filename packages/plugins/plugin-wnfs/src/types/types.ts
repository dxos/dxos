//
// Copyright 2025 DXOS.org
//

import { FileInfoSchema } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';

import { FileType } from './file';
import { WNFS_PLUGIN } from '../meta';

export namespace WnfsAction {
  export class Create extends S.TaggedClass<Create>()(`${WNFS_PLUGIN}/action/create`, {
    input: FileInfoSchema.pick('name', 'type', 'cid').pipe(S.required),
    output: S.Struct({
      object: FileType,
    }),
  }) {}

  export const UploadAnnotationId = Symbol.for(`${WNFS_PLUGIN}/annotation/upload`);

  export const UploadFileSchema = S.Struct({
    file: S.instanceOf(File).annotations({
      [UploadAnnotationId]: {
        // Accept file types.
        'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
        // TODO(wittjosiah): Add more file types.
      },
    }),
  });

  export type UploadFileForm = S.Schema.Type<typeof UploadFileSchema>;

  export class Upload extends S.TaggedClass<Upload>()(`${WNFS_PLUGIN}/action/upload`, {
    input: S.extend(UploadFileSchema, S.Struct({ space: SpaceSchema })),
    output: S.required(FileInfoSchema),
  }) {}
}
