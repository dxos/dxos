//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from '../meta';

import * as File from './File';

export namespace WnfsAction {
  export const UploadAnnotationId = Symbol.for(`${meta.id}.annotation.upload`);

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
