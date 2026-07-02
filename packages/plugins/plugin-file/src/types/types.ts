//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from '#meta';

import { ACCEPTED_MIME } from './limits';

export namespace FileAction {
  export const UploadAnnotationId = Symbol.for(`${meta.profile.key}.annotation.upload`);

  export const CreateFileSchema = Schema.Struct({
    file: Schema.instanceOf(File).annotations({
      [UploadAnnotationId]: ACCEPTED_MIME,
    }),
  });

  export type CreateFileForm = Schema.Schema.Type<typeof CreateFileSchema>;
}
