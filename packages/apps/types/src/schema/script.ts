//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

export class ScriptType extends EchoObjectSchema({ typename: 'braneframe.Script', version: '0.1.0' })({
  title: S.string,
  source: S.string,
}) {}

export const isScript = (data: unknown): data is ScriptType => !!data && data instanceof ScriptType;
