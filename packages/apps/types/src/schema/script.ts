//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _ScriptSchema = S.struct({
  title: S.string,
  source: S.string,
}).pipe(E.echoObject('braneframe.Script', '0.1.0'));
export interface ScriptType extends E.ObjectType<typeof _ScriptSchema> {}
export const ScriptSchema: S.Schema<ScriptType> = _ScriptSchema;

export const isScript = (data: unknown): data is ScriptType => !!data && E.getSchema(data) === ScriptSchema;
