//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Common } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';

import { meta } from '../meta';

import * as File from './File';

export namespace WnfsAction {
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
}

const WNFS_OPERATION = `${meta.id}/operation`;

export namespace WnfsOperation {
  export const Create = Operation.make({
    meta: { key: `${WNFS_OPERATION}/create`, name: 'Create WNFS File' },
    schema: {
      input: Common.FileInfoSchema.pick('name', 'type', 'cid').pipe(Schema.required),
      output: Schema.Struct({
        object: File.File,
      }),
    },
  });

  export const Upload = Operation.make({
    meta: { key: `${WNFS_OPERATION}/upload`, name: 'Upload File' },
    schema: {
      input: Schema.extend(WnfsAction.UploadFileSchema, Schema.Struct({ db: Database.Database })),
      output: Schema.required(Common.FileInfoSchema),
    },
  });

  export const CreateFile = Operation.make({
    meta: { key: `${WNFS_OPERATION}/create-file`, name: 'Create File' },
    schema: {
      input: Schema.extend(WnfsAction.UploadFileSchema, Schema.Struct({ db: Database.Database })),
      output: Schema.Struct({
        object: File.File,
      }),
    },
  });
}
