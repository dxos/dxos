//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _FileSchema = S.struct({
  filename: S.string,
  type: S.string,
  timestamp: S.optional(S.string),
  title: S.optional(S.string),
  cid: S.optional(S.string),
}).pipe(E.echoObject('braneframe.File', '0.1.0'));
export interface FileType extends E.ObjectType<typeof _FileSchema> {}
export const FileSchema: S.Schema<FileType> = _FileSchema;

export const isFile = (data: unknown): data is FileType => !!data && E.getSchema(data) === FileSchema;
