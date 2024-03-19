//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _FolderSchema = S.struct({
  name: S.optional(S.string),
  objects: S.array(E.ref(E.AnyEchoObject)),
}).pipe(E.echoObject('braneframe.Folder', '0.1.0'));
export interface FolderType extends E.ObjectType<typeof _FolderSchema> {}
export const FolderSchema: S.Schema<FolderType> = _FolderSchema;

export const isFolder = (data: unknown): data is FolderType => !!data && E.getSchema(data) === FolderSchema;

const _ViewSchema = S.struct({
  title: S.string,
  type: S.string,
}).pipe(E.echoObject('braneframe.View', '0.1.0'));
export interface ViewType extends E.ObjectType<typeof _ViewSchema> {}
export const ViewSchema: S.Schema<ViewType> = _ViewSchema;
